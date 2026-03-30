"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  ChefHat,
  ChevronDown,
  Clock3,
  Loader2,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Suggestion = {
  name: string;
  description: string;
  effortLevel: string;
  estimatedTime: number;
  servings: number;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    inPantry: boolean;
  }>;
  instructions: string[];
  missingItems: string[];
};

function getEffortColor(level: string) {
  if (level === "easy") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (level === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

export default function TonightPage() {
  const suggestFromPantry = useAction(api.actions.quickDinner.suggestFromPantry);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError("");
    setSuggestions([]);
    setExpandedIndex(null);
    try {
      const result = await suggestFromPantry({});
      if (result.suggestions.length === 0) {
        setError("Add some items to your pantry first so I can suggest recipes.");
      } else {
        setSuggestions(result.suggestions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell
      header={
        <PageHeader
          title="Tonight's Dinner"
          subtitle="Quick suggestions from your pantry"
        />
      }
    >
      <div className="space-y-4 px-4 py-4 page-transition">
        {suggestions.length === 0 && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center animate-fade-in-up">
            <div className="relative mb-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 to-accent/10">
                <UtensilsCrossed className="h-11 w-11 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center animate-pulse-soft">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              {/* Floating food emojis */}
              <div className="absolute -bottom-2 -left-4 text-lg animate-pulse-soft" style={{ animationDelay: "0.3s" }}>🍳</div>
              <div className="absolute top-0 -left-5 text-sm animate-pulse-soft" style={{ animationDelay: "0.8s" }}>🥘</div>
              <div className="absolute -bottom-1 right-[-18px] text-sm animate-pulse-soft" style={{ animationDelay: "1.2s" }}>🍲</div>
            </div>
            <h3 className="mb-2 text-xl font-semibold tracking-tight">What can I make tonight?</h3>
            <p className="mb-6 max-w-[280px] text-sm text-muted-foreground leading-relaxed">
              I&apos;ll look at your pantry and suggest 3 dinners you can make right now — no trip to the store needed.
            </p>
            <p className="mb-8 max-w-[260px] text-xs text-muted-foreground/70 leading-relaxed">
              💡 Tip: The more items in your <a href="/pantry" className="underline text-primary">pantry</a>, the better the suggestions.
            </p>
            <Button onClick={() => void handleGenerate()} size="lg" className="gap-2 rounded-xl">
              <Sparkles className="h-4 w-4" />
              Suggest Dinners
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center animate-fade-in">
            <div className="relative mb-6">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
            <p className="text-sm font-medium">Checking your pantry...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Finding the best dinner options
            </p>
            <div className="flex gap-1 mt-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft"
                  style={{ animationDelay: `${i * 0.3}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center animate-scale-in">
            <p className="mb-4 text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => void handleGenerate()} className="rounded-xl">
              Try Again
            </Button>
          </div>
        )}

        {suggestions.map((suggestion, index) => {
          const isExpanded = expandedIndex === index;
          const pantryCount = suggestion.ingredients.filter(i => i.inPantry).length;
          const totalCount = suggestion.ingredients.length;
          const matchPct = totalCount > 0 ? Math.round((pantryCount / totalCount) * 100) : 0;
          const circumference = 2 * Math.PI * 18;
          const strokeDashoffset = circumference - (matchPct / 100) * circumference;

          return (
            <Card
              key={index}
              className={`overflow-hidden card-interactive opacity-0 animate-fade-in stagger-${index + 1}`}
            >
              <CardContent className="p-0">
                <button
                  type="button"
                  className="w-full text-left p-4 transition-colors hover:bg-muted/20"
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <h3 className="text-lg font-semibold leading-tight tracking-tight">
                        {suggestion.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {suggestion.description}
                      </p>
                    </div>
                    {/* Pantry match ring */}
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="relative h-11 w-11">
                        <svg className="h-11 w-11 -rotate-90" viewBox="0 0 44 44">
                          <circle cx="22" cy="22" r="18" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                          <circle
                            cx="22" cy="22" r="18" fill="none"
                            stroke={matchPct === 100 ? "hsl(var(--primary))" : "hsl(var(--accent))"}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-700"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                          {matchPct}%
                        </span>
                      </div>
                      <span className="text-[9px] text-muted-foreground mt-0.5">match</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-medium capitalize ${getEffortColor(suggestion.effortLevel)}`}>
                      {suggestion.effortLevel}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      {suggestion.estimatedTime}m
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                      <ChefHat className="h-3 w-3" />
                      Serves {suggestion.servings}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                      suggestion.missingItems.length === 0
                        ? "bg-primary/10 text-primary"
                        : "bg-accent/10 text-accent"
                    }`}>
                      {pantryCount}/{totalCount} in pantry
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t px-4 py-4 space-y-4 animate-fade-in">
                    {suggestion.missingItems.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
                          Need to buy
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestion.missingItems.map((item) => (
                            <span key={item} className="inline-flex items-center rounded-lg bg-accent/10 text-accent px-2 py-0.5 text-xs font-medium">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Ingredients
                      </p>
                      <div className="space-y-1.5">
                        {suggestion.ingredients.map((ing, i) => (
                          <div key={i} className="flex items-center gap-2.5 text-sm">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                ing.inPantry ? "bg-primary" : "bg-muted-foreground/25"
                              }`}
                            />
                            <span className={ing.inPantry ? "" : "text-muted-foreground"}>
                              {ing.quantity} {ing.unit} {ing.name}
                            </span>
                            {ing.inPantry && (
                              <span className="text-[10px] font-medium text-primary bg-primary/8 rounded px-1 py-0.5">In pantry</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Instructions
                      </p>
                      <ol className="space-y-2.5">
                        {suggestion.instructions.map((step, i) => (
                          <li key={i} className="flex gap-3 text-sm">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {i + 1}
                            </span>
                            <span className="leading-relaxed pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {suggestions.length > 0 && (
          <Button
            variant="outline"
            className="w-full gap-2 rounded-xl opacity-0 animate-fade-in"
            style={{ animationDelay: "0.4s" }}
            onClick={() => void handleGenerate()}
            disabled={isLoading}
          >
            <Sparkles className="h-4 w-4" />
            Suggest Different Dinners
          </Button>
        )}
      </div>
    </AppShell>
  );
}
