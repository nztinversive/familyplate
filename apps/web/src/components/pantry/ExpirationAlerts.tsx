"use client";

import { useQuery } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import { AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ExpirationAlerts() {
  const pantryItems = useQuery(api.queries.pantry.getMyPantryItems, {});

  if (!pantryItems) return null;

  const now = Date.now();

  const expiring = pantryItems
    .filter((item) => {
      if (!item.expirationDate) return false;
      const daysLeft = (item.expirationDate - now) / (24 * 60 * 60 * 1000);
      return daysLeft <= 3 && daysLeft > 0;
    })
    .sort((a, b) => (a.expirationDate ?? 0) - (b.expirationDate ?? 0));

  const expired = pantryItems.filter(
    (item) => item.expirationDate && item.expirationDate < now
  );

  if (expiring.length === 0 && expired.length === 0) return null;

  const formatDays = (expirationDate: number) => {
    const days = Math.ceil((expirationDate - now) / (24 * 60 * 60 * 1000));
    if (days <= 0) return "Expired";
    if (days === 1) return "Tomorrow";
    return `${days} days`;
  };

  return (
    <div className="space-y-2">
      {expired.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-destructive">
              {expired.length} item{expired.length > 1 ? "s" : ""} expired
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {expired.slice(0, 5).map((item) => (
                <Badge key={item._id} variant="destructive" className="text-xs">
                  {item.name}
                </Badge>
              ))}
              {expired.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{expired.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {expiring.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-500/20 bg-yellow-50 p-3 dark:bg-yellow-500/5">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-500">
              Expiring soon
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {expiring.map((item) => (
                <Badge
                  key={item._id}
                  variant="outline"
                  className="border-yellow-500/30 text-xs text-yellow-700 dark:text-yellow-500"
                >
                  {item.name} - {formatDays(item.expirationDate!)}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
