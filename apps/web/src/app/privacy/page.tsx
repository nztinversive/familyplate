import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
        <Link href="/" className="text-sm font-semibold text-primary">
          FamilyPlate
        </Link>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Privacy Policy
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Privacy at FamilyPlate
          </h1>
          <p className="mt-4 text-muted-foreground">
            Last updated May 8, 2026.
          </p>
        </div>

        <PolicySection title="Information We Collect">
          <p>
            FamilyPlate collects account details, household profiles, pantry
            items, grocery lists, saved recipes, meal plans, dietary
            preferences, allergies, dislikes, feedback, and app activity needed
            to provide meal-planning features.
          </p>
          <p>
            If you use photo or barcode features, FamilyPlate may process
            grocery photos, barcode values, and recognized item details to help
            update your pantry.
          </p>
        </PolicySection>

        <PolicySection title="How We Use Information">
          <p>
            We use your information to create meal plans, suggest dinners,
            maintain pantry and grocery lists, personalize recipes, manage
            subscriptions, improve reliability, and provide support.
          </p>
        </PolicySection>

        <PolicySection title="AI Providers">
          <p>
            FamilyPlate uses third-party AI providers, including OpenAI, to
            generate meal plans, dinner ideas, recipe content, and grocery
            recognition. Your pantry items, recipes, preferences, allergies,
            dislikes, household details, prompts, and grocery photos may be sent
            to these providers only to fulfill the feature you request.
          </p>
          <p>
            AI can make mistakes. Always verify ingredients, package labels, and
            allergy safety before cooking or serving food.
          </p>
        </PolicySection>

        <PolicySection title="Payments">
          <p>
            Subscription payments may be processed by Apple In-App Purchase on
            iOS and by third-party payment providers on the web. Payment
            processors handle payment details under their own privacy terms.
          </p>
        </PolicySection>

        <PolicySection title="Account Deletion">
          <p>
            You can delete your account from Settings in the FamilyPlate mobile
            app. Account deletion removes your account and personal profile
            data. If you are the only signed-in member of a household, the
            household pantry, recipes, meal plans, and grocery lists are also
            deleted.
          </p>
        </PolicySection>

        <PolicySection title="Contact">
          <p>
            For privacy questions, contact{" "}
            <a className="text-primary" href="mailto:support@familyplate.co">
              support@familyplate.co
            </a>
            .
          </p>
        </PolicySection>
      </section>
    </main>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-border pt-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="space-y-3 leading-7 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
