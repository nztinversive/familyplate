import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
        <Link href="/" className="text-sm font-semibold text-primary">
          FamilyPlate
        </Link>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Terms of Service
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            FamilyPlate Terms
          </h1>
          <p className="mt-4 text-muted-foreground">
            Last updated May 8, 2026.
          </p>
        </div>

        <TermsSection title="Use of FamilyPlate">
          <p>
            FamilyPlate helps households plan meals, manage pantry items, build
            grocery lists, and save recipes. You are responsible for your
            account activity and for checking all meal, grocery, and nutrition
            information before relying on it.
          </p>
        </TermsSection>

        <TermsSection title="Food, Allergy, and Nutrition Information">
          <p>
            FamilyPlate is not medical advice and does not diagnose, treat, or
            prevent health conditions. Meal suggestions and allergy screening are
            assistance tools only. Always verify labels, ingredients, and
            preparation methods, especially for allergies or medical diets.
          </p>
        </TermsSection>

        <TermsSection title="AI Features">
          <p>
            Some features use third-party AI providers to generate or recognize
            content. AI output may be incomplete or inaccurate. You should review
            generated recipes, instructions, grocery matches, and safety notes
            before using them.
          </p>
        </TermsSection>

        <TermsSection title="Subscriptions">
          <p>
            Paid Family features may be offered through Apple In-App Purchase on
            iOS and through third-party checkout providers on the web.
            Subscription terms, renewal, cancellation, and refunds are handled
            by the payment provider used for the purchase.
          </p>
        </TermsSection>

        <TermsSection title="Account Deletion">
          <p>
            You can delete your account from Settings in the FamilyPlate mobile
            app. Deleting an account is permanent and may remove household data
            when no other signed-in household member remains.
          </p>
        </TermsSection>

        <TermsSection title="Contact">
          <p>
            For support, contact{" "}
            <a className="text-primary" href="mailto:support@familyplate.co">
              support@familyplate.co
            </a>
            .
          </p>
        </TermsSection>
      </section>
    </main>
  );
}

function TermsSection({
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
