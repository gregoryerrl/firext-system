"use client";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {cn} from "@/lib/utils";
import {Weight, Calendar} from "lucide-react";

export function DockCard({dock}) {
  const getWeightStatus = (weightInKg) => {
    if (weightInKg >= 4.1)
      return {
        color: "green",
        text: "Full Weight",
        weight: weightInKg.toFixed(1),
      };
    if (weightInKg >= 3.2)
      return {
        color: "yellow",
        text: "Mid Weight",
        weight: weightInKg.toFixed(1),
      };
    return {
      color: "red",
      text: "Low Weight - Leak Detected",
      weight: weightInKg.toFixed(1),
    };
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(new Date(date));
  };

  const getExpirationStatus = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);

    // Get the difference in months more accurately
    const monthsDiff =
      (expiry.getFullYear() - now.getFullYear()) * 12 +
      (expiry.getMonth() - now.getMonth());

    // Adjust for day of month
    const dayDiff = expiry.getDate() - now.getDate();
    const adjustedMonths = monthsDiff + (dayDiff < 0 ? -1 : 0);

    if (adjustedMonths < 0) return {color: "red", text: "Expired"};
    if (adjustedMonths < 1) return {color: "yellow", text: "Expiring Soon"};
    return {color: "green", text: "Valid"};
  };

  const weightStatus = getWeightStatus(dock.weight);
  const expiryStatus = getExpirationStatus(dock.expires_at);

  const statusColors = {
    green: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
    yellow: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
    red: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">{dock.name}</CardTitle>
          <p className="text-xs text-muted-foreground">{dock.location}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Badge
            variant="secondary"
            className={cn(
              "pointer-events-none",
              statusColors[weightStatus.color]
            )}
          >
            <Weight className="mr-1 h-3 w-3" />
            {weightStatus.text}
          </Badge>
          <Badge
            variant="secondary"
            className={cn(
              "pointer-events-none",
              statusColors[expiryStatus.color]
            )}
          >
            <Calendar className="mr-1 h-3 w-3" />
            {expiryStatus.text}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-medium">Weight</div>
            <div className="text-2xl font-bold">
              {weightStatus.weight}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                kg
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium">Expires</div>
            <div className="text-sm font-medium">
              {formatDate(dock.expires_at)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
