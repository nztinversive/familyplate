"use client";

import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@familyplate/convex/_generated/api";
import type { Id } from "@familyplate/convex/_generated/dataModel";
import {
  ChefHat,
  Clock3,
  Heart,
  Loader2,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isIngredientAvailable } from "@/lib/ingredientAvailability";

type Suggestion = {
  _id?: string;
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

const CRAVING_CHIPS = [
  { label: "Chicken", emoji: "🍗" },
  { label: "Beef", emoji: "🥩" },
  { label: "Pasta", emoji: "🍝" },
  { label: "Seafood", emoji: "🦐" },
  { label: "Vegetarian", emoji: "🥬" },
  { label: "Comfort Food", emoji: "🍲" },
  { label: "Stir Fry", emoji: "🥘" },
  { label: "Tacos", emoji: "🌮" },
];

function getEffortColor(level: string) {
  if (level === "easy") return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
  if (level === "medium") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
  return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800";
}

export default function TonightPage() {
  const suggestFromPantry = useAction(api.actions.quickDinner.suggestFromPantry);
  const persistedSuggestions = useQuery(api.queries.planner.getQuickDinnerSuggestions, {});
  const savedRecipes = useQuery(api.queries.savedRecipes.getMySavedRecipes, {});
  const saveRecipeMutation = useMutation(api.mutations.savedRecipes.saveRecipe);
  const unsaveRecipeMutation = useMutation(api.mutations.savedRecipes.unsaveRecipe);

  const [freshSuggestions, setFreshSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [craving, setCraving] = useState("");
  const [customCraving, setCustomCraving] = useState("");
  const [activeCraving, setActiveCraving] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);

  // Map persisted DB suggestions to the local Suggestion shape
  const initialSuggestions = useMemo<Suggestion[]>(() => {
    if (!persistedSuggestions || persistedSuggestions.length === 0) return [];
    return persistedSuggestions.map((r) => ({
      _id: r._id,
      name: r.title,
      description: r.description,
      effortLevel: r.effortLevel,
      estimatedTime: r.estimatedTime,
      servings: r.servings,
      ingredients: r.ingredients,
      instructions: r.instructions,
      missingItems: r.ingredients
        .filter((ing) => !isIngredientAvailable(ing))
        .map((ing) => ing.name),
    }));
  }, [persistedSuggestions]);

  // Show fresh results if just generated, otherwise show persisted
  const suggestions = freshSuggestions.length > 0 ? freshSuggestions : initialSuggestions;

  const handleToggleSave = async (recipeId: string) => {
    setSavingRecipeId(recipeId);
    try {
      const typedId = recipeId as Id<"recipeSuggestions">;
      const isSaved = savedRecipes?.some((s) => s.recipe._id === typedId);
      if (isSaved) {
        await unsaveRecipeMutation({ recipeId: typedId });
      } else {
        await saveRecipeMutation({ recipeId: typedId });
      }
    } finally {
      setSavingRecipeId(null);
    }
  };

  const handleGenerate = async (overrideCraving?: string) => {
    const cravingValue = overrideCraving ?? (craving || customCraving.trim());
    setIsLoading(true);
    setError("");
    setFreshSuggestions([]);
    setExpandedIndex(null);
    setActiveCraving(cravingValue);
    setHasGenerated(true);
    try {
      const result = await suggestFromPantry({
        craving: cravingValue || undefined,
      });
      if (result.suggestions.length === 0) {
        setError("Add some items to your pantry first so I can suggest recipes.");
      } else {
        setFreshSuggestions(result.suggestions);
      }
    } catch (err) {
      setError(
        err instanceof ConvexError
          ? (err.data as string)
          : err instanceof Error
            ? err.message
            : "Something went wrong"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectChip = (label: string) => {
    if (craving === label) {
      setCraving("");
    } else {
      setCraving(label);
      setCustomCraving("");
    }
  };

  const showInitialState = !hasGenerated && suggestions.length === 0;

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
        {/* Hero — only on first visit */}
        {showInitialState && (
          <div className="flex flex-col items-center justify-center px-4 pt-6 pb-2 text-center animate-fade-in-up">
            <div className="relative mb-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 to-accent/10">
                <UtensilsCrossed className="h-10 w-10 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center animate-pulse-soft">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
              </div>
              <div className="absolute -bottom-2 -left-3 text-base animate-pulse-soft" style={{ animationDelay: "0.3s" }}>🍳</div>
              <div className="absolute top-0 -left-4 text-xs animate-pulse-soft" style={{ animationDelay: "0.8s" }}>🥘</div>
              <div className="absolute -bottom-1 right-[-14px] text-xs animate-pulse-soft" style={{ animationDelay: "1.2s" }}>🍲</div>
            </div>
            <h3 className="mb-1.5 text-xl font-semibold tracking-tight">What sounds good tonight?</h3>
            <p className="mb-4 max-w-[280px] text-sm text-muted-foreground leading-relaxed">
              Pick a craving or just hit suggest — I&apos;ll find 3 dinners from your pantry.
            </p>
          </div>
        )}

        {/* Craving selector — always visible unless loading */}
        {!isLoading && (
          <div className="animate-fade-in">
            {/* Craving chips */}
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 text-center">I&apos;m in the mood for...</p>
              <div className="flex flex-wrap justify-center gap-2">
                {CRAVING_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => selectChip(chip.label)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                      craving === chip.label
                        ? "border-primary bg-primary text-primary-foreground shadow-sm scale-105"
                        : "border-input bg-background text-foreground hover:border-primary/30 hover:bg-muted/30"
                    }`}
                  >
                    <span>{chip.emoji}</span>
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom craving input */}
            <div className="max-w-sm mx-auto mb-3">
              <div className="relative">
                <Input
                  placeholder='Or type anything... "something spicy", "Thai"'
                  value={customCraving}
                  onChange={(e) => {
                    setCustomCraving(e.target.value);
                    if (e.target.value) setCraving("");
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleGenerate(); } }}
                  className="h-11 rounded-xl pr-10 text-sm"
                />
                {customCraving && (
                  <button
                    type="button"
                    onClick={() => setCustomCraving("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Generate button */}
            <div className="flex justify-center">
              <Button onClick={() => void handleGenerate()} size="lg" className="gap-2 rounded-xl">
                <Sparkles className="h-4 w-4" />
                {craving || customCraving
                  ? `Suggest ${craving || customCraving} Dinners`
                  : suggestions.length > 0 ? "Suggest Different Dinners" : "Suggest Dinners"}
              </Button>
            </div>

            {showInitialState && (
              <p className="mt-3 text-center text-xs text-muted-foreground/70 leading-relaxed">
                💡 The more items in your <a href="/pantry" className="underline text-primary">pantry</a>, the better the suggestions.
              </p>
            )}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center animate-fade-in">
            <div className="relative mb-5">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            </div>
            <p className="text-sm font-medium">
              {activeCraving ? `Finding ${activeCraving.toLowerCase()} recipes...` : "Checking your pantry..."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Finding the best dinner options
            </p>
            <div className="flex gap-1 mt-3">
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

        {/* Error state */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center animate-scale-in">
            <p className="mb-4 text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => void handleGenerate()} className="rounded-xl">
              Try Again
            </Button>
          </div>
        )}

        {/* Active craving badge above results */}
        {suggestions.length > 0 && activeCraving && (
          <div className="flex items-center justify-center gap-2 animate-fade-in">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-medium">
              Showing: {activeCraving}
              <button
                type="button"
                onClick={() => { setActiveCraving(""); setCraving(""); setCustomCraving(""); }}
                className="hover:bg-primary/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}

        {/* Suggestion cards */}
        {suggestions.map((suggestion, index) => {
          const isExpanded = expandedIndex === index;
          const pantryCount = suggestion.ingredients.filter((ingredient) =>
            isIngredientAvailable(ingredient)
          ).length;
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
                    {suggestion._id && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void handleToggleSave(suggestion._id!); }}
                        disabled={savingRecipeId === suggestion._id}
                        className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                        aria-label={savedRecipes?.some((s) => s.recipe._id === suggestion._id) ? "Remove from cookbook" : "Save to cookbook"}
                      >
                        <Heart className={`h-3.5 w-3.5 ${savedRecipes?.some((s) => s.recipe._id === suggestion._id) ? "fill-current text-primary" : ""}`} />
                        {savedRecipes?.some((s) => s.recipe._id === suggestion._id) ? "Saved" : "Save"}
                      </button>
                    )}
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
                        {suggestion.ingredients.map((ing, i) => {
                          const isAvailable = isIngredientAvailable(ing);

                          return (
                            <div key={i} className="flex items-center gap-2.5 text-sm">
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full ${
                                  isAvailable ? "bg-primary" : "bg-muted-foreground/25"
                                }`}
                              />
                              <span className={isAvailable ? "" : "text-muted-foreground"}>
                                {ing.quantity} {ing.unit} {ing.name}
                              </span>
                              {isAvailable && (
                                <span className="text-[10px] font-medium text-primary bg-primary/8 rounded px-1 py-0.5">In pantry</span>
                              )}
                            </div>
                          );
                        })}
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
      </div>
    </AppShell>
  );
}
