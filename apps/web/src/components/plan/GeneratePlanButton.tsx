"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { Sparkles } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getCurrentWeekStartDate } from "@/lib/mealPlan";
import { Button, type ButtonProps } from "@/components/ui/button";

type GeneratePlanButtonProps = Omit<ButtonProps, "onClick"> & {
  householdId: Id<"households"> | null | undefined;
  weekStartDate?: string;
  onError?: (message: string) => void;
  onSuccess?: () => void;
  idleLabel?: string;
  busyLabel?: string;
};

export function GeneratePlanButton({
  householdId,
  weekStartDate = getCurrentWeekStartDate(),
  onError,
  onSuccess,
  idleLabel = "Generate Plan",
  busyLabel = "Generating...",
  children,
  disabled,
  ...buttonProps
}: GeneratePlanButtonProps) {
  const generateMealPlan = useAction(api.actions.generateMealPlan.generateMealPlan);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleClick = async () => {
    if (!householdId || isGenerating) return;

    setIsGenerating(true);
    onError?.("");

    try {
      await generateMealPlan({
        householdId,
        weekStartDate,
      });
      onSuccess?.();
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "Unable to generate the meal plan."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      {...buttonProps}
      disabled={disabled || !householdId || isGenerating}
      onClick={() => void handleClick()}
    >
      <Sparkles className="mr-2 h-4 w-4" />
      {children ?? (isGenerating ? busyLabel : idleLabel)}
    </Button>
  );
}
