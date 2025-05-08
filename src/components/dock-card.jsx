"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {CheckIcon, AlertTriangle, History} from "lucide-react";
import {cn} from "@/lib/utils";

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

export function DockCard({dock}) {
  const router = useRouter();

  // Always parse weight to ensure it's a number
  const weight = parseFloat(dock.weight || 0);

  // Derive LED state directly from weight regardless of stored value
  // LED should be ON (true) when weight is 0 or <= 3.2
  const derivedLedState = weight === 0 || weight <= 3.2;

  // Log discrepancy for debugging if any
  if (Boolean(dock.led_state) !== derivedLedState) {
    console.log(
      `INCONSISTENCY - Dock ${dock.id}: DB led_state=${dock.led_state}, Weight-based led_state=${derivedLedState}, weight=${weight}`
    );
  }

  // Always use weight-derived LED state for display
  const isLedOn = derivedLedState;

  // Status for weight
  const isWeightOk = weight > 3.2;

  const daysUntilExpiry = (() => {
    if (!dock.expires_at) return null;
    const expiryDate = new Date(dock.expires_at);
    const today = new Date();
    const diffTime = expiryDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  })();

  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

  const handleReweighClick = () => {
    if (dock && dock.id) {
      router.push(`/docks/${dock.id}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{dock.name}</span>
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
              isWeightOk
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            )}
          >
            {dock.led_num}
          </div>
        </CardTitle>
        <CardDescription>{dock.location}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Weight</span>
          <span
            className={cn(
              "text-sm font-medium",
              isWeightOk ? "text-green-600" : "text-red-600"
            )}
          >
            {weight.toFixed(1)} kg
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">LED Status</span>
          <span
            className={cn(
              "flex items-center text-sm font-medium",
              isLedOn ? "text-red-600" : "text-green-600"
            )}
          >
            {isLedOn ? (
              <>
                <AlertTriangle className="mr-1 h-3.5 w-3.5" /> LED ON
              </>
            ) : (
              <>
                <CheckIcon className="mr-1 h-3.5 w-3.5" /> LED OFF
              </>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Expiry</span>
          <span
            className={cn(
              "text-sm font-medium",
              isExpired
                ? "text-red-600"
                : isExpiringSoon
                ? "text-amber-600"
                : "text-green-600"
            )}
          >
            {daysUntilExpiry === null
              ? "N/A"
              : isExpired
              ? "Expired"
              : `${daysUntilExpiry} days`}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t mt-2">
          <span className="flex items-center">
            <History className="mr-1 h-3 w-3" /> Last Reviewed:
          </span>
          <span>{formatSimpleDate(dock.last_reweighed_at)}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleReweighClick} className="w-full">
          Reweigh Dock
        </Button>
      </CardFooter>
    </Card>
  );
}
