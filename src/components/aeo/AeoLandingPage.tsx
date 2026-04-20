import Link from "next/link";
import { ChefHat, Clock3, UtensilsCrossed } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ConversionCTA } from "./ConversionCTA";
import { EmbeddedDinnerForm } from "./EmbeddedDinnerForm";

export type AeoExample = {
  name: string;
  description: string;
  estimatedTime: number;
  servings: number;
  ingredients: string[];
  steps: string[];
};

export type AeoSection = {
  h2: string;
  body: string[];
  bullets?: string[];
};

export type AeoFaq = { q: string; a: string };

export type AeoContent = {
  slug: string;
  h1: string;
  subhead: string;
  formDefaults: {
    pantry?: string;
    allergies?: string[];
    craving?: string;
    placeholder?: string;
    buttonLabel?: string;
  };
  sections: AeoSection[];
  examples: AeoExample[];
  faq: AeoFaq[];
  related: Array<{ href: string; label: string }>;
};

function recipeJsonLd(ex: AeoExample) {
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: ex.name,
    description: ex.description,
    recipeYield: `${ex.servings} servings`,
    totalTime: `PT${ex.estimatedTime}M`,
    recipeIngredient: ex.ingredients,
    recipeInstructions: ex.steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      text: step,
    })),
  };
}

function faqJsonLd(faq: AeoFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function AeoLandingPage({ content }: { content: AeoContent }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {content.examples.map((ex) => (
        <script
          key={ex.name}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeJsonLd(ex)) }}
        />
      ))}
      {content.faq.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(content.faq)) }}
        />
      )}

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

      {/* Hero + form */}
      <header className="mb-10 text-center">
        <h1 className="mb-3 font-display text-3xl tracking-tight sm:text-5xl">
          {content.h1}
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-base text-muted-foreground sm:text-lg">
          {content.subhead}
        </p>

        <Card className="mx-auto max-w-xl text-left">
          <CardContent className="space-y-4 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Try it now
            </p>
            <EmbeddedDinnerForm
              defaultPantry={content.formDefaults.pantry}
              defaultAllergies={content.formDefaults.allergies}
              defaultCraving={content.formDefaults.craving}
              sourcePage={`/${content.slug}`}
              placeholder={content.formDefaults.placeholder}
              buttonLabel={content.formDefaults.buttonLabel}
            />
          </CardContent>
        </Card>
      </header>

      {/* Body sections */}
      <div className="prose prose-slate dark:prose-invert mx-auto max-w-2xl space-y-10">
        {content.sections.map((section) => (
          <section key={section.h2}>
            <h2 className="mb-3 font-display text-2xl tracking-tight sm:text-3xl">
              {section.h2}
            </h2>
            {section.body.map((para, i) => (
              <p key={i} className="mb-3 leading-relaxed text-foreground/90">
                {para}
              </p>
            ))}
            {section.bullets && (
              <ul className="ml-5 list-disc space-y-1.5 text-foreground/90">
                {section.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {/* Examples */}
        {content.examples.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-2xl tracking-tight sm:text-3xl">
              Example dinners
            </h2>
            <div className="space-y-4 not-prose">
              {content.examples.map((ex) => (
                <Card key={ex.name}>
                  <CardContent className="space-y-3 p-5">
                    <div>
                      <h3 className="text-lg font-semibold">{ex.name}</h3>
                      <p className="text-sm text-muted-foreground">{ex.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                        <Clock3 className="h-3 w-3" />
                        {ex.estimatedTime}m
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                        <ChefHat className="h-3 w-3" />
                        Serves {ex.servings}
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Ingredients
                        </p>
                        <ul className="space-y-0.5 text-sm">
                          {ex.ingredients.map((ing, i) => (
                            <li key={i}>• {ing}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Steps
                        </p>
                        <ol className="space-y-1 text-sm">
                          {ex.steps.map((step, i) => (
                            <li key={i}>
                              {i + 1}. {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {content.faq.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-2xl tracking-tight sm:text-3xl">
              Common questions
            </h2>
            <div className="space-y-4 not-prose">
              {content.faq.map((item) => (
                <div key={item.q}>
                  <h3 className="mb-1 font-semibold">{item.q}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Final CTA */}
      <Card className="mt-10 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="space-y-3 p-6 text-center">
          <h3 className="font-display text-2xl">Want this every week?</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            FamilyPlate plans 7 dinners around your pantry, your family's allergies, and what they actually liked last week.
          </p>
          <ConversionCTA sourcePage={`/${content.slug}`} />
          <p className="text-xs text-muted-foreground">No credit card required.</p>
        </CardContent>
      </Card>

      {/* Related */}
      {content.related.length > 0 && (
        <section className="mt-12">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Related
          </h3>
          <ul className="space-y-1.5">
            {content.related.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="text-primary hover:underline">
                  {r.label} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-12 border-t pt-6 text-center text-xs text-muted-foreground">
        <p>
          <Link href="/dinner-tonight" className="underline hover:text-foreground">
            Try the full pantry-to-dinner generator →
          </Link>
        </p>
      </footer>
    </main>
  );
}
