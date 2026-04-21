"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Loader2, Sparkles, X } from "lucide-react";
import { api } from "@familyplate/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  clearPendingPantry,
  getPendingPantry,
  type PendingPantry,
} from "@/lib/pendingPantry";

export function PendingPantryBanner() {
  const [pending, setPending] = useState<PendingPantry | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const importItems = useMutation(api.mutations.pantry.bulkImportFromGenerator);
  const { toast } = useToast();

  useEffect(() => {
    const data = getPendingPantry();
    if (data && data.items.length > 0) setPending(data);
  }, []);

  if (!pending || isDismissed) return null;

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const result = await importItems({
        items: pending.items,
        allergies: pending.allergies,
      });
      clearPendingPantry();
      toast(
        `Added ${result.inserted} item${result.inserted === 1 ? "" : "s"} from your generator session.`,
        "success"
      );
      setIsDismissed(true);
    } catch (err) {
      toast(
        err instanceof ConvexError
          ? (err.data as string)
          : "Couldn't import items. Please add them manually.",
        "error"
      );
      setIsImporting(false);
    }
  };

  const handleDismiss = () => {
    clearPendingPantry();
    setIsDismissed(true);
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Import {pending.items.length} item{pending.items.length === 1 ? "" : "s"} from your generator session?
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {pending.items.slice(0, 8).join(", ")}
              {pending.items.length > 8 ? ` + ${pending.items.length - 8} more` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isImporting}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={isImporting}
            size="sm"
            className="flex-1 gap-1.5 rounded-xl"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Importing...
              </>
            ) : (
              <>Import to my pantry</>
            )}
          </Button>
          <Button
            onClick={handleDismiss}
            disabled={isImporting}
            variant="ghost"
            size="sm"
            className="rounded-xl"
          >
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
