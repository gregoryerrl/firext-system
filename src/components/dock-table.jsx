"use client";

import {useState} from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Edit, Trash2, Copy, Check} from "lucide-react";
import {cn} from "@/lib/utils";

export function DockTable({docks, onEdit, onDelete}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const filteredDocks = docks.filter(
    (dock) =>
      dock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dock.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyId = async (id) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(new Date(date));
  };

  const formatWeight = (weight) => {
    return weight.toFixed(1);
  };

  const getWeightClass = (weight) => {
    if (weight >= 4.1) return "text-green-500";
    if (weight >= 3.2) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div>
      <div className="flex items-center gap-4 p-4">
        <Input
          placeholder="Search docks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Weight (kg)</TableHead>
            <TableHead>Expiration Date</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredDocks.map((dock) => (
            <TableRow key={dock.id}>
              <TableCell className="font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-[80px]">{dock.id}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleCopyId(dock.id)}
                  >
                    {copiedId === dock.id ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </TableCell>
              <TableCell className="font-medium">{dock.name}</TableCell>
              <TableCell>{dock.location}</TableCell>
              <TableCell>
                <span className={getWeightClass(dock.weight)}>
                  {formatWeight(dock.weight)} kg
                </span>
              </TableCell>
              <TableCell>{formatDate(dock.expires_at)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(dock)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(dock.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
