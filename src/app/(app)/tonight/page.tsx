"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  ChefHat,
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
      <div className="space-y-4 px-4 py-4">
        {suggestions.length === 0 && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <UtensilsCrossed className="h-10 w-10 text-primary" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">What can I make tonight?</h3>
            <p className="mb-6 max-w-[280px] text-sm text-muted-foreground">
              I will look at your pantry and suggest 3 dinners you can make right now.
            </p>
            <Button onClick={() => void handleGenerate()} size="lg" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Suggest Dinners
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Checking your pantry...</p>
            <p className="text-xs text-muted-foreground">
              Finding the best dinner options
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <p className="mb-4 text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => void handleGenerate()}>
              Try Again
            </Button>
          </div>
        )}

        {suggestions.map((suggestion, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="space-y-3 p-4">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold leading-tight">
                      {suggestion.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {suggestion.description}
                    </p>
                  </div>
                  <Badge
                    variant={
                      suggestion.effortLevel === "easy"
                        ? "secondary"
                        : suggestion.effortLevel === "hard"
                          ? "destructive"
                          : "outline"
                    }
                    className="shrink-0 capitalize"
                  >
                    {suggestion.effortLevel}
                  </Badge>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    <Clock3 className="mr-1 h-3 w-3" />
                    {suggestion.estimatedTime} min
                  </Badge>
                  <Badge variant="outline">
                    <ChefHat className="mr-1 h-3 w-3" />
                    Serves {suggestion.servings}
                  </Badge>
                  <Badge
                    variant={
                      suggestion.missingItems.length === 0 ? "secondary" : "outline"
                    }
                  >
                    {suggestion.missingItems.length === 0
                      ? "All ingredients in pantry"
                      : `${suggestion.missingItems.length} item${
                          suggestion.missingItems.length > 1 ? "s" : ""
                        } needed`}
                  </Badge>
                </div>
              </button>

              {expandedIndex === index && (
                <div className="space-y-4 border-t pt-4">
                  {suggestion.missingItems.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                        Need to buy
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestion.missingItems.map((item) => (
                          <Badge key={item} variant="outline" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      Ingredients
                    </p>
                    <div className="space-y-1">
                      {suggestion.ingredients.map((ing, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              ing.inPantry ? "bg-primary" : "bg-muted-foreground/30"
                            }`}
                          />
                          <span className={ing.inPantry ? "" : "text-muted-foreground"}>
                            {ing.quantity} {ing.unit} {ing.name}
                          </span>
                          {ing.inPantry && (
                            <span className="text-xs text-primary">In pantry</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      Instructions
                    </p>
                    <ol className="space-y-2">
                      {suggestion.instructions.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {i + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {suggestions.length > 0 && (
          <Button
            variant="outline"
            className="w-full gap-2"
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
