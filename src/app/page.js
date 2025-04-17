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
} from "firebase/database";
import {Shell} from "@/components/shell";
import {DockCard} from "@/components/dock-card";
import {db} from "@/lib/firebase";
import {ProtectedRoute} from "@/components/protected-route";
import {toast} from "sonner";
import {AlertTriangle, AlertCircle} from "lucide-react";

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

      // Check for leaks and show notifications
      docksArray.forEach((dock) => {
        // Ensure we have numeric values
        const weightNum = parseFloat(dock.weight || 0);
        const currLedState = Boolean(dock.led_state);

        // Determine correct LED state based on weight
        // LED should be ON (true) when weight is 0 or <= 3.2
        const correctLedState = weightNum === 0 || weightNum <= 3.2;

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
      });
    });

    return () => unsubscribe();
  }, []);

  return (
    <ProtectedRoute>
      <Shell title="Dashboard">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docks.map((dock) => (
            <DockCard key={dock.id} dock={dock} />
          ))}
        </div>
      </Shell>
    </ProtectedRoute>
  );
}
