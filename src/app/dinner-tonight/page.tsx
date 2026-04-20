"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import {
  ChefHat,
  Clock3,
  Loader2,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ConversionCTA } from "@/components/aeo/ConversionCTA";
import { getOrCreateFingerprint } from "@/lib/publicFingerprint";

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

const QUICK_ADD_CHIPS = [
  { label: "Chicken", emoji: "🍗" },
  { label: "Ground beef", emoji: "🥩" },
  { label: "Pasta", emoji: "🍝" },
  { label: "Rice", emoji: "🍚" },
  { label: "Eggs", emoji: "🥚" },
  { label: "Tortillas", emoji: "🌯" },
  { label: "Black beans", emoji: "🫘" },
  { label: "Frozen veggies", emoji: "🥦" },
  { label: "Tomato sauce", emoji: "🍅" },
  { label: "Cheese", emoji: "🧀" },
  { label: "Onion", emoji: "🧅" },
  { label: "Garlic", emoji: "🧄" },
];

const ALLERGY_CHIPS = ["Dairy", "Wheat/Gluten", "Eggs", "Peanuts", "Tree nuts", "Soy", "Shellfish", "Fish"];

function effortColor(level: string) {
  if (level === "easy")
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
  if (level === "medium")
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
  return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800";
}

export default function DinnerTonightPage() {
  const { toast } = useToast();
  const generate = useAction(api.actions.publicDinner.generate);
  const logEvent = useMutation(api.mutations.publicEvents.logEvent);

  const [pantryText, setPantryText] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [craving, setCraving] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const addChip = (label: string) => {
    const lower = pantryText.toLowerCase();
    if (lower.includes(label.toLowerCase())) return;
    setPantryText((prev) => (prev.trim() ? `${prev.trim()}, ${label}` : label));
  };

  const toggleAllergy = (allergy: string) => {
    setAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy]
    );
  };

  const handleGenerate = async () => {
    if (!pantryText.trim()) {
      toast("Add a few pantry items first.", "error");
      return;
    }
    setIsLoading(true);
    setSuggestions([]);
    setPlanId(null);
    setExpandedIndex(0);
    try {
      const result = await generate({
        pantryText: pantryText.trim(),
        allergies,
        craving: craving.trim() || undefined,
        fingerprint: getOrCreateFingerprint(),
        sourcePage: "/dinner-tonight",
      });
      setSuggestions(result.suggestions);
      setPlanId(result.planId);
    } catch (err) {
      toast(
        err instanceof ConvexError
          ? (err.data as string)
          : err instanceof Error
            ? err.message
            : "Something went wrong",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 page-transition">
      {/* Top nav */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-xl">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          FamilyPlate
        </Link>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          Sign up free →
        </Link>
      </div>

      {/* Hero */}
      <div className="mb-6 text-center animate-fade-in-up">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 to-accent/10">
          <UtensilsCrossed className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mb-2 font-display text-3xl tracking-tight sm:text-4xl">
          What's for dinner tonight?
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Type a few things in your kitchen. Get 3 dinner ideas you can actually cook tonight — and exactly what you're missing.
        </p>
      </div>

      {/* Input card */}
      <Card className="mb-6">
        <CardContent className="space-y-5 p-5">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              What's in your kitchen?
            </label>
            <Textarea
              placeholder="e.g. chicken thighs, rice, frozen broccoli, soy sauce, garlic..."
              value={pantryText}
              onChange={(e) => setPantryText(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {QUICK_ADD_CHIPS.map((chip) => {
                const active = pantryText.toLowerCase().includes(chip.label.toLowerCase());
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => addChip(chip.label)}
                    disabled={active}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                      active
                        ? "border-primary/30 bg-primary/10 text-primary cursor-default"
                        : "border-input bg-background hover:border-primary/30 hover:bg-muted/30"
                    }`}
                  >
                    <span>{chip.emoji}</span>
                    <span>{chip.label}</span>
                    {!active && <span className="ml-0.5 text-muted-foreground">+</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Any allergies? (optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALLERGY_CHIPS.map((a) => {
                const active = allergies.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAllergy(a)}
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                      active
                        ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                        : "border-input bg-background hover:border-red-300 hover:bg-red-50/40"
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              In the mood for? (optional)
            </label>
            <Input
              placeholder='e.g. "something quick", "Mexican", "comfort food"'
              value={craving}
              onChange={(e) => setCraving(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={isLoading || !pantryText.trim()}
            className="w-full gap-2 rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finding tonight's dinner...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Find dinner
              </>
            )}
          </Button>

        </CardContent>
      </Card>

      {/* Results */}
      {suggestions.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-tight">3 dinners for tonight</h2>
            {planId && (
              <Link
                href={`/dinner-tonight/plan/${planId}`}
                className="text-xs text-primary hover:underline"
                onClick={() => {
                  void logEvent({
                    name: "plan_shared",
                    sourcePage: "/dinner-tonight",
                    planId: planId as never,
                    fingerprint: getOrCreateFingerprint(),
                  }).catch(() => {});
                }}
              >
                Share this plan ↗
              </Link>
            )}
          </div>

          {suggestions.map((s, index) => {
            const isExpanded = expandedIndex === index;
            const pantryCount = s.ingredients.filter((i) => i.inPantry).length;
            const totalCount = s.ingredients.length;
            const matchPct = totalCount > 0 ? Math.round((pantryCount / totalCount) * 100) : 0;

            return (
              <Card key={index} className="overflow-hidden card-interactive">
                <CardContent className="p-0">
                  <button
                    type="button"
                    className="w-full p-4 text-left transition-colors hover:bg-muted/20"
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="text-lg font-semibold leading-tight">{s.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {s.description}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-2xl font-bold text-primary">{matchPct}%</div>
                        <div className="text-[10px] text-muted-foreground">pantry match</div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-medium capitalize ${effortColor(s.effortLevel)}`}
                      >
                        {s.effortLevel}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                        <Clock3 className="h-3 w-3" />
                        {s.estimatedTime}m
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                        <ChefHat className="h-3 w-3" />
                        Serves {s.servings}
                      </span>
                      {s.missingItems.length > 0 ? (
                        <span className="inline-flex items-center rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                          Missing {s.missingItems.length}: {s.missingItems.slice(0, 2).join(", ")}
                          {s.missingItems.length > 2 ? "…" : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          You have everything
                        </span>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-4 border-t px-4 py-4 animate-fade-in">
                      {s.missingItems.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
                            What you're missing
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {s.missingItems.map((item) => (
                              <span
                                key={item}
                                className="inline-flex items-center rounded-lg bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
                              >
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
                        <ul className="space-y-1.5">
                          {s.ingredients.map((ing, i) => (
                            <li key={i} className="flex items-center gap-2.5 text-sm">
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full ${ing.inPantry ? "bg-primary" : "bg-muted-foreground/25"}`}
                              />
                              <span className={ing.inPantry ? "" : "text-muted-foreground"}>
                                {ing.quantity} {ing.unit} {ing.name}
                              </span>
                              {ing.inPantry && (
                                <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary">
                                  In pantry
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Instructions
                        </p>
                        <ol className="space-y-2.5">
                          {s.instructions.map((step, i) => (
                            <li key={i} className="flex gap-3 text-sm">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {i + 1}
                              </span>
                              <span className="pt-0.5 leading-relaxed">{step}</span>
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

          {/* Conversion CTA */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="space-y-3 p-5 text-center">
              <h3 className="font-display text-xl">Want this every week?</h3>
              <p className="text-sm text-muted-foreground">
                FamilyPlate plans 7 dinners around your pantry, your family's allergies, and what you actually liked last week. We'll save what you typed so you don't have to enter it twice.
              </p>
              <ConversionCTA
                pantryItems={[pantryText]}
                allergies={allergies}
                craving={craving || undefined}
                sourcePage="/dinner-tonight"
                planId={planId ?? undefined}
                label="Start planning free with these items"
              />
              <p className="text-xs text-muted-foreground">No credit card required.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t pt-6 text-center text-xs text-muted-foreground">
        <p>
          Built by <Link href="/" className="hover:text-foreground underline">FamilyPlate</Link> — smart family dinner planning.
        </p>
      </footer>
    </main>
  );
}
