"use client";

import {useEffect, useState} from "react";
import {ref, onValue, query, orderByChild} from "firebase/database";
import {Shell} from "@/components/shell";
import {DockCard} from "@/components/dock-card";
import {db} from "@/lib/firebase";
import {ProtectedRoute} from "@/components/protected-route";
import {toast} from "sonner";
import {AlertTriangle} from "lucide-react";

export default function DashboardPage() {
  const [docks, setDocks] = useState([]);

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

      // Check for leaks and show notifications
      docksArray.forEach((dock) => {
        if (dock.weight < 3.2) {
          toast.warning(
            <div className="flex flex-col gap-1">
              <div className="font-medium">Leak Detected!</div>
              <div className="text-sm text-muted-foreground">
                {dock.name} at {dock.location} has low weight (
                {dock.weight.toFixed(1)} kg)
              </div>
            </div>,
            {
              icon: <AlertTriangle className="h-4 w-4" />,
              duration: 10000, // 10 seconds
              id: `leak-${dock.id}`, // Prevent duplicate toasts
            }
          );
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
