"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import { Clock3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type ExpiringItem = {
  _id: string;
  name: string;
  expirationDate?: number;
};

function getExpiringSoon(items: ExpiringItem[]) {
  const now = Date.now();
  return items
    .filter((item) => {
      if (!item.expirationDate) return false;
      const daysLeft = (item.expirationDate - now) / (24 * 60 * 60 * 1000);
      return daysLeft <= 4 && daysLeft >= 0;
    })
    .sort((a, b) => (a.expirationDate ?? 0) - (b.expirationDate ?? 0))
    .slice(0, 4);
}

function formatDays(expirationDate?: number) {
  if (!expirationDate) return "";
  const days = Math.ceil((expirationDate - Date.now()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days}d`;
}

export function CookTheseFirst({
  onCook,
}: {
  onCook?: (ingredient: string) => void;
}) {
  const pantryItems = useQuery(api.queries.pantry.getMyPantryItems, {});
  const expiringItems = useMemo(
    () => getExpiringSoon(pantryItems ?? []),
    [pantryItems],
  );

  if (!pantryItems || expiringItems.length === 0) return null;

  return (
    <div className="rounded-xl border border-yellow-500/20 bg-yellow-50/80 p-3 dark:bg-yellow-500/5">
      <div className="mb-2 flex items-center gap-2">
        <Clock3 className="h-4 w-4 text-yellow-700 dark:text-yellow-500" />
        <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-500">
          Cook these first
        </p>
      </div>
      <div className="space-y-2">
        {expiringItems.map((item) => (
          <div key={item._id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                Expires {formatDays(item.expirationDate)}
              </p>
            </div>
            {onCook ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1.5 rounded-lg bg-background/70"
                onClick={() => onCook(item.name)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Ideas
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1.5 rounded-lg bg-background/70"
              >
                <Link href={`/tonight?ingredient=${encodeURIComponent(item.name)}`}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Ideas
                </Link>
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
