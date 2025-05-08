"use client";

import {useEffect, useState} from "react";
import {
  ref,
  onValue,
  query,
  orderByChild,
  update,
  set,
  child,
  remove,
} from "firebase/database";
import {Shell} from "@/components/shell";
import {DockCard} from "@/components/dock-card";
import {db} from "@/lib/firebase";
import {ProtectedRoute} from "@/components/protected-route";
import {toast} from "sonner";
import {AlertTriangle, AlertCircle, Clock} from "lucide-react";

// Define weight thresholds
const WEIGHT_THRESHOLD_LOW = 3.2;
const WEIGHT_THRESHOLD_MID_UPPER = 4.1; // Define if not already present
const EXPIRY_WARNING_DAYS = 30; // Days before expiry to include in to_expire
const DAYS_FOR_REWEIGH = 30; // Trigger reweigh if not viewed in 30 days

// Helper function to calculate days until expiry (date part only)
const calculateDaysUntilExpiry = (expiryDateString) => {
  if (!expiryDateString) return null;
  try {
    const expiryDate = new Date(expiryDateString);
    const today = new Date();
    // Set hours to 0 to compare dates only, avoiding time zone issues
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);
    const diffTime = expiryDate - today;
    // Calculate difference in days
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error("Error calculating days until expiry:", error);
    return null;
  }
};

// --- Simple Date Formatter for Last Reviewed ---
const formatSimpleDate = (timestamp) => {
  if (!timestamp) return "Never";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(timestamp));
  } catch (e) {
    return "Invalid Date";
  }
};
// --- End Simple Date Formatter ---

export default function DashboardPage() {
  const [docks, setDocks] = useState([]);

  // Function to directly force-update LED state in Firebase
  const forceSyncLedState = (dockId, weight, currLedState) => {
    // Revised condition: LED should be ON (true) when weight is 0 or < 3.2
    const correctLedState = weight === 0 || weight <= 3.2;

    // Only update if there's a mismatch
    if (currLedState !== correctLedState) {
      console.log(
        `FORCE SYNC: Setting dock ${dockId} LED state to ${correctLedState} (weight=${weight})`
      );

      // Use direct path update to ensure it's written correctly
      const ledRef = ref(db, `docks/${dockId}/led_state`);
      set(ledRef, correctLedState)
        .then(() =>
          console.log(`Successfully updated LED state for dock ${dockId}`)
        )
        .catch((err) =>
          console.error(`Failed to update LED state for dock ${dockId}:`, err)
        );
    }
  };

  // Function to validate and fix all LED states in the database
  const validateAllLedStates = (docks) => {
    console.log("Validating LED states for all docks...");

    docks.forEach((dock) => {
      const weight = parseFloat(dock.weight || 0);
      const currLedState = Boolean(dock.led_state);
      const correctLedState = weight === 0 || weight <= 3.2;

      if (currLedState !== correctLedState) {
        console.log(
          `Fixing LED state for dock ${dock.id}: ${currLedState} -> ${correctLedState}`
        );
        const dockRef = ref(db, `docks/${dock.id}`);
        update(dockRef, {led_state: correctLedState})
          .then(() => console.log(`Fixed LED state for dock ${dock.id}`))
          .catch((err) =>
            console.error(`Failed to fix LED state for dock ${dock.id}:`, err)
          );
      }
    });
  };

  // Function to update the permanent tables
  const updatePermanentTables = (allDocks) => {
    console.log("Updating permanent tables: to_expire and forReweigh");

    // --- Update to_expire table (5 days or less left) ---
    const expiringSoonDocks = allDocks
      .map((dock) => ({
        ...dock,
        daysLeft: calculateDaysUntilExpiry(dock.expires_at),
      }))
      // Update filter condition to include <= 5 days
      .filter((dock) => dock.daysLeft !== null && dock.daysLeft <= 5)
      .sort((a, b) => a.daysLeft - b.daysLeft) // Sort by soonest expiry
      .slice(0, 5); // Still limit to 5

    const toExpireLeds = {};
    expiringSoonDocks.forEach((dock) => {
      if (dock.led_num !== undefined && dock.led_num !== null) {
        toExpireLeds[dock.id] = dock.led_num;
      }
    });

    const toExpireRef = ref(db, "to_expire");
    set(toExpireRef, toExpireLeds)
      .then(() =>
        console.log("'to_expire' (<= 5 days) table updated:", toExpireLeds)
      )
      .catch((err) => console.error("Error updating 'to_expire' table:", err));

    // --- Update forReweigh table (Not reviewed in 30 days) ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - DAYS_FOR_REWEIGH);

    const needsReweighDocks = allDocks
      .filter((dock) => {
        // Include if never reviewed OR reviewed more than 30 days ago
        return (
          !dock.last_reweighed_at ||
          new Date(dock.last_reweighed_at) < thirtyDaysAgo
        );
      })
      // Sort by last reweighed date (oldest first, nulls first)
      .sort((a, b) => {
        const dateA = a.last_reweighed_at
          ? new Date(a.last_reweighed_at)
          : new Date(0); // Treat null as very old
        const dateB = b.last_reweighed_at
          ? new Date(b.last_reweighed_at)
          : new Date(0);
        return dateA - dateB;
      })
      .slice(0, 5); // Take top 5 oldest reviews

    const forReweighLeds = {};
    needsReweighDocks.forEach((dock) => {
      if (dock.led_num !== undefined && dock.led_num !== null) {
        forReweighLeds[dock.id] = dock.led_num;
      }
    });

    const forReweighRef = ref(db, "forReweigh");
    set(forReweighRef, forReweighLeds)
      .then(() =>
        console.log("'forReweigh' (inactive) table updated:", forReweighLeds)
      )
      .catch((err) => console.error("Error updating 'forReweigh' table:", err));
  };

  useEffect(() => {
    const docksRef = ref(db, "docks");
    const docksQuery = query(docksRef, orderByChild("expires_at"));

    const unsubscribe = onValue(docksQuery, (snapshot) => {
      const data = snapshot.val();
      const docksArray = data
        ? Object.entries(data)
            .map(([id, value]) => ({
              id,
              ...value,
            }))
            .sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at))
        : [];

      setDocks(docksArray);

      // Run a full validation on initial load
      validateAllLedStates(docksArray);

      // --- Update permanent tables ---
      if (docksArray.length > 0) {
        updatePermanentTables(docksArray);
      } else {
        // Clear tables if no docks exist
        set(ref(db, "to_expire"), {});
        set(ref(db, "forReweigh"), {});
      }
      // --- End update permanent tables ---

      // Check for leaks and show notifications
      docksArray.forEach((dock) => {
        // Ensure we have numeric values
        const weightNum = parseFloat(dock.weight || 0);
        const currLedState = Boolean(dock.led_state);

        // Determine correct LED state based on weight
        // LED should be ON (true) when weight is 0 or <= 3.2
        const correctLedState =
          weightNum === 0 || weightNum <= WEIGHT_THRESHOLD_LOW;

        console.log(
          `Dock ${dock.id}: weight=${weightNum}, current_led=${currLedState}, should_be=${correctLedState}`
        );

        // Force sync the LED state with weight
        forceSyncLedState(dock.id, weightNum, currLedState);

        // If LED state doesn't match what it should be based on weight, show notification
        if (currLedState !== correctLedState) {
          // Show appropriate notification
          if (correctLedState) {
            toast.warning(
              <div className="flex flex-col gap-1">
                <div className="font-medium">Leak Detected!</div>
                <div className="text-sm text-muted-foreground">
                  {dock.name} at {dock.location} has low weight (
                  {weightNum.toFixed(1)} kg) - LED {dock.led_num} activated
                </div>
              </div>,
              {
                icon: <AlertTriangle className="h-4 w-4" />,
                duration: 10000,
                id: `leak-${dock.id}`,
              }
            );
          } else {
            toast.success(
              <div className="flex flex-col gap-1">
                <div className="font-medium">Weight Restored</div>
                <div className="text-sm text-muted-foreground">
                  {dock.name} at {dock.location} weight is now normal (
                  {weightNum.toFixed(1)} kg) - LED {dock.led_num} deactivated
                </div>
              </div>,
              {
                duration: 5000,
                id: `restore-${dock.id}`,
              }
            );
          }
        }

        // --- Add Expiration Check ---
        const daysLeft = calculateDaysUntilExpiry(dock.expires_at);

        // Show warning exactly 5 days before expiration
        if (daysLeft === 5) {
          toast.warning(
            <div className="flex flex-col gap-1">
              <div className="font-medium">Expiration Warning</div>
              <div className="text-sm text-muted-foreground">
                {dock.name} at {dock.location} will expire in 5 days.
              </div>
            </div>,
            {
              icon: <Clock className="h-4 w-4" />,
              duration: 15000, // Longer duration for warning
              id: `expiry-warning-5-${dock.id}`, // Unique ID
            }
          );
        }
        // --- End Expiration Check ---
      });
    });

    return () => unsubscribe();
  }, []);

  return (
    <ProtectedRoute>
      <Shell title="Dashboard">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docks.map((dock) => (
            <DockCard
              key={dock.id}
              dock={dock}
              formatSimpleDate={formatSimpleDate}
            />
          ))}
        </div>
      </Shell>
    </ProtectedRoute>
  );
}
