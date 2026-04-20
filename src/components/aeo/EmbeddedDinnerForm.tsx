"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { Loader2, Sparkles } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getOrCreateFingerprint } from "@/lib/publicFingerprint";

type Props = {
  defaultPantry?: string;
  defaultAllergies?: string[];
  defaultCraving?: string;
  sourcePage: string;
  buttonLabel?: string;
  placeholder?: string;
};

export function EmbeddedDinnerForm({
  defaultPantry = "",
  defaultAllergies = [],
  defaultCraving = "",
  sourcePage,
  buttonLabel = "Generate 3 dinner ideas",
  placeholder = "e.g. chicken thighs, rice, frozen broccoli, garlic...",
}: Props) {
  const router = useRouter();
  const generate = useAction(api.actions.publicDinner.generate);
  const [pantryText, setPantryText] = useState(defaultPantry);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!pantryText.trim()) {
      setError("Add a few pantry items first.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const result = await generate({
        pantryText: pantryText.trim(),
        allergies: defaultAllergies,
        craving: defaultCraving || undefined,
        fingerprint: getOrCreateFingerprint(),
        sourcePage,
      });
      router.push(`/dinner-tonight/plan/${result.planId}`);
    } catch (err) {
      setError(
        err instanceof ConvexError
          ? (err.data as string)
          : err instanceof Error
            ? err.message
            : "Something went wrong"
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        placeholder={placeholder}
        value={pantryText}
        onChange={(e) => setPantryText(e.target.value)}
        rows={3}
        className="resize-none text-sm"
        disabled={isLoading}
      />
      <Button
        onClick={handleSubmit}
        disabled={isLoading || !pantryText.trim()}
        size="lg"
        className="w-full gap-2 rounded-xl"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Finding dinners...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {buttonLabel}
          </>
        )}
      </Button>
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
      <p className="text-center text-xs text-muted-foreground">
        Free. No signup needed for first 5 generations per day.
      </p>
    </div>
  );
}
