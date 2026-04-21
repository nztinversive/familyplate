import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { ChefHat, Clock3, UtensilsCrossed } from "lucide-react";
import { api } from "@familyplate/convex/_generated/api";
import type { Id } from "@familyplate/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { ConversionCTA } from "@/components/aeo/ConversionCTA";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud";

function getClient() {
  return new ConvexHttpClient(CONVEX_URL);
}

type PlanSuggestion = {
  name: string;
  description: string;
  effortLevel: "easy" | "medium" | "hard";
  estimatedTime: number;
  servings: number;
  ingredients: Array<{ name: string; quantity: number; unit: string; inPantry: boolean }>;
  instructions: string[];
  missingItems: string[];
};

type Plan = {
  _id: string;
  pantryText: string;
  allergies: string[];
  craving?: string;
  suggestions: PlanSuggestion[];
  sourcePage?: string;
  createdAt: number;
};

async function loadPlan(id: string): Promise<Plan | null> {
  try {
    const result = (await getClient().query(api.queries.publicDinner.getPlan, {
      id: id as Id<"publicPlans">,
    })) as Plan | null;
    return result;
  } catch {
    return null;
  }
}

function isPlanIndexable(plan: Plan): boolean {
  if (plan.suggestions.length < 3) return false;
  if (plan.pantryText.trim().length < 15) return false;
  for (const s of plan.suggestions) {
    if (!s.name.trim() || !s.description.trim()) return false;
    if (s.ingredients.length < 3) return false;
    if (s.instructions.length < 3) return false;
  }
  return true;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const plan = await loadPlan(id);
  if (!plan) {
    return {
      title: "Dinner plan not found | FamilyPlate",
      robots: { index: false, follow: false },
    };
  }

  const titles = plan.suggestions.map((s) => s.name).slice(0, 3).join(", ");
  const indexable = isPlanIndexable(plan);
  return {
    title: `Dinner ideas: ${titles} | FamilyPlate`,
    description: `3 dinner ideas generated from your pantry: ${titles}. Free pantry-to-dinner generator from FamilyPlate.`,
    alternates: { canonical: `/dinner-tonight/plan/${id}` },
    robots: { index: indexable, follow: true },
    openGraph: {
      title: `Tonight's dinner: ${plan.suggestions[0]?.name ?? "3 ideas"}`,
      description: `3 family dinner ideas built around what's in the kitchen.`,
      url: `/dinner-tonight/plan/${id}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `Tonight's dinner: ${plan.suggestions[0]?.name ?? "3 ideas"}`,
      description: "3 family dinner ideas built around what's in the kitchen.",
    },
  };
}

function recipeJsonLd(s: PlanSuggestion) {
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: s.name,
    description: s.description,
    recipeYield: `${s.servings} servings`,
    totalTime: `PT${s.estimatedTime}M`,
    recipeIngredient: s.ingredients.map(
      (ing) => `${ing.quantity} ${ing.unit} ${ing.name}`
    ),
    recipeInstructions: s.instructions.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      text: step,
    })),
    suitableForDiet: undefined,
  };
}

function effortColor(level: string) {
  if (level === "easy") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (level === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = await loadPlan(id);
  if (!plan) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {plan.suggestions.map((s) => (
        <script
          key={s.name}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeJsonLd(s)) }}
        />
      ))}

      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-xl">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          FamilyPlate
        </Link>
        <Link
          href="/dinner-tonight"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Generate another →
        </Link>
      </div>

      <div className="mb-6 text-center">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Tonight's dinner ideas
        </p>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
          3 dinners from your pantry
        </h1>
        {plan.craving && (
          <p className="mt-2 text-sm text-muted-foreground">
            Built around: <span className="font-medium text-foreground">{plan.craving}</span>
          </p>
        )}
      </div>

      <div className="space-y-4">
        {plan.suggestions.map((s, index) => {
          const pantryCount = s.ingredients.filter((i) => i.inPantry).length;
          const totalCount = s.ingredients.length;
          const matchPct =
            totalCount > 0 ? Math.round((pantryCount / totalCount) * 100) : 0;

          return (
            <Card key={index} className="overflow-hidden">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="text-xl font-semibold tracking-tight">{s.name}</h2>
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-2xl font-bold text-primary">{matchPct}%</div>
                    <div className="text-[10px] text-muted-foreground">pantry match</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
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
                </div>

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

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Ingredients
                    </p>
                    <ul className="space-y-1.5">
                      {s.ingredients.map((ing, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${ing.inPantry ? "bg-primary" : "bg-muted-foreground/25"}`}
                          />
                          <span className={ing.inPantry ? "" : "text-muted-foreground"}>
                            {ing.quantity} {ing.unit} {ing.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Instructions
                    </p>
                    <ol className="space-y-2">
                      {s.instructions.map((step, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Conversion CTA */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="space-y-3 p-5 text-center">
            <h3 className="font-display text-xl">Want a full week of dinners like this?</h3>
            <p className="text-sm text-muted-foreground">
              FamilyPlate plans 7 dinners around your pantry, learns what your family likes, and
              builds the grocery list automatically. We'll save these pantry items so you don't have to enter them twice.
            </p>
            <ConversionCTA
              pantryItems={[plan.pantryText]}
              allergies={plan.allergies}
              craving={plan.craving}
              sourcePage={`/dinner-tonight/plan/${id}`}
              planId={id}
              label="Start planning free with these items"
            />
            <p className="text-xs text-muted-foreground">No credit card required.</p>
          </CardContent>
        </Card>
      </div>

      <footer className="mt-12 border-t pt-6 text-center text-xs text-muted-foreground">
        <p>
          <Link href="/dinner-tonight" className="underline hover:text-foreground">
            Generate your own dinner ideas →
          </Link>
        </p>
      </footer>
    </main>
  );
}
