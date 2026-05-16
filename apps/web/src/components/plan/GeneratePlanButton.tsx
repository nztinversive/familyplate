"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { Sparkles } from "lucide-react";
import { api } from "@familyplate/convex/_generated/api";
import type { Id } from "@familyplate/convex/_generated/dataModel";
import { getCurrentWeekStartDate } from "@/lib/mealPlan";
import { Button, type ButtonProps } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import * as Sentry from "@sentry/nextjs";

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
      track("meal_plan_generation_started", {
        source: "web_button",
        week_start_date: weekStartDate,
      });
      await generateMealPlan({
        householdId,
        weekStartDate,
      });
      track("meal_plan_generated", {
        source: "web_button",
        week_start_date: weekStartDate,
      });
      onSuccess?.();
    } catch (error) {
      track("meal_plan_generation_failed", {
        source: "web_button",
        week_start_date: weekStartDate,
        reason: error instanceof Error ? error.message : "unknown",
      });
      Sentry.captureException(error, {
        tags: { area: "plan", action: "generate_plan", platform: "web" },
      });
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
