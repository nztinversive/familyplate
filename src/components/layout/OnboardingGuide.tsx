"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Package, Settings, Sparkles, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ONBOARDING_KEY = "familyplate-onboarding-dismissed";

const STEPS = [
  {
    icon: Settings,
    title: "Set your preferences",
    description: "Add dietary preferences, allergies, and dislikes in Settings so the AI avoids them.",
    path: "/settings",
    cta: "Go to Settings",
  },
  {
    icon: Package,
    title: "Stock your pantry",
    description: "Add what you already have — the AI will prioritize using these ingredients first.",
    path: "/pantry",
    cta: "Add Pantry Items",
  },
  {
    icon: Sparkles,
    title: "Generate your first plan",
    description: "Hit Generate and get 7 personalized dinners with alternatives and nutrition info.",
    path: "/plan",
    cta: "Generate Plan",
  },
];

export function OnboardingGuide() {
  const [dismissed, setDismissed] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem(ONBOARDING_KEY);
    if (!stored) setDismissed(false);
  }, []);

  if (dismissed) return null;

  const currentStepIndex = STEPS.findIndex((step) => pathname === step.path);

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setDismissed(true);
  };

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-primary/2 animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold">Welcome to FamilyPlate! 🍽️</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get started in 3 steps
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted/60 transition-colors"
            aria-label="Dismiss guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCurrent = index === currentStepIndex;
            const isPast = currentStepIndex > index;

            return (
              <a
                key={step.path}
                href={step.path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                  isCurrent
                    ? "bg-primary/10 ring-1 ring-primary/20"
                    : isPast
                      ? "opacity-60"
                      : "hover:bg-muted/40"
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isCurrent ? "bg-primary text-primary-foreground" : isPast ? "bg-muted" : "bg-muted/60"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">
                    {index + 1}. {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {step.description}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
              </a>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="w-full mt-3 text-xs text-muted-foreground"
        >
          I know what I&apos;m doing — dismiss
        </Button>
      </CardContent>
    </Card>
  );
}
