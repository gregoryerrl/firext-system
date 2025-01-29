"use client";

import {useState, useEffect} from "react";
import {
  ref,
  onValue,
  push,
  update,
  remove,
  query,
  orderByChild,
  serverTimestamp,
} from "firebase/database";
import {Shell} from "@/components/shell";
import {DockTable} from "@/components/dock-table";
import {DockForm} from "@/components/dock-form";
import {Button} from "@/components/ui/button";
import {Plus} from "lucide-react";
import {db} from "@/lib/firebase";
import {ProtectedRoute} from "@/components/protected-route";

export default function ConfigurePage() {
  const [docks, setDocks] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDock, setSelectedDock] = useState(null);

  useEffect(() => {
    const docksRef = ref(db, "docks");
    const docksQuery = query(docksRef, orderByChild("created_at"));

    const unsubscribe = onValue(docksQuery, (snapshot) => {
      const data = snapshot.val();
      const docksArray = data
        ? Object.entries(data)
            .map(([id, value]) => ({
              id,
              ...value,
            }))
            .sort((a, b) => b.created_at - a.created_at)
        : [];

      setDocks(docksArray);
    });

    return () => unsubscribe();
  }, []);

  const handleCreate = async (data) => {
    try {
      const docksRef = ref(db, "docks");
      const newDockRef = push(docksRef);
      await update(newDockRef, {
        ...data,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating dock:", error);
    }
  };

  const handleUpdate = async (data) => {
    if (!selectedDock) return;
    try {
      const dockRef = ref(db, `docks/${selectedDock.id}`);
      await update(dockRef, {
        ...data,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating dock:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const dockRef = ref(db, `docks/${id}`);
      await remove(dockRef);
    } catch (error) {
      console.error("Error deleting dock:", error);
    }
  };

  const handleEdit = (dock) => {
    setSelectedDock(dock);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setSelectedDock(null);
    setIsFormOpen(false);
  };

  const handleFormSubmit = (data) => {
    if (selectedDock) {
      handleUpdate(data);
    } else {
      handleCreate(data);
    }
  };

  return (
    <ProtectedRoute>
      <Shell title="Configure Docks">
        <div className="rounded-lg border bg-card">
          <div className="p-4 flex justify-between items-center">
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Dock
            </Button>
          </div>
          <div className="border-t">
            <DockTable
              docks={docks}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>
        <DockForm
          isOpen={isFormOpen}
          onClose={handleFormClose}
          onSubmit={handleFormSubmit}
          initialData={selectedDock}
        />
      </Shell>
    </ProtectedRoute>
  );
}
