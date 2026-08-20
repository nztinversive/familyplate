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
            Last updated August 19, 2026.
          </p>
        </div>

        <TermsSection title="Using FamilyPlate">
          <p>
            FamilyPlate helps households plan meals, manage pantry items, build
            grocery lists, and save recipes. By using FamilyPlate, you agree to
            these terms and our{" "}
            <Link className="text-primary" href="/privacy">
              Privacy Policy
            </Link>
            . FamilyPlate is designed for adults. An adult may manage meal and
            preference information for members of their household.
          </p>
          <p>
            You are responsible for keeping your account credentials secure,
            for activity performed through your account, and for ensuring that
            information you add about other household members is lawful and
            appropriate to share with the service.
          </p>
        </TermsSection>

        <TermsSection title="Food, Allergy, and Health Information">
          <p>
            FamilyPlate is not a medical device and does not diagnose, treat,
            cure, or prevent any medical condition. It is not medical advice.
            Consult a healthcare professional for medical advice, diagnosis, or
            treatment.
          </p>
          <p>
            Meal suggestions, nutrition estimates, expiration estimates, and
            allergy screening are assistance tools only. Always verify package
            labels, ingredients, cross-contamination risks, storage conditions,
            preparation methods, and food safety before cooking or serving,
            especially for allergies or medical diets.
          </p>
        </TermsSection>

        <TermsSection title="AI Features">
          <p>
            Some features use third-party AI providers to generate or recognize
            content. AI output may be incomplete, inaccurate, unsafe, or
            unsuitable for your household. You are responsible for reviewing
            generated recipes, instructions, grocery matches, nutrition
            estimates, and safety notes before using them.
          </p>
          <p>
            You may not use FamilyPlate or its AI features to create unlawful,
            deceptive, abusive, exploitative, infringing, or otherwise harmful
            content, or to interfere with the service or another user.
          </p>
        </TermsSection>

        <TermsSection title="Subscriptions">
          <p>
            Optional paid Family features may be offered through Google Play on
            Android, Apple In-App Purchase on iOS, or a third-party checkout
            provider on the web. RevenueCat helps manage mobile subscription
            access but does not replace the store that processes your payment.
            The price, billing period, renewal terms, and any trial or offer are
            shown before purchase.
          </p>
          <p>
            Auto-renewing subscriptions continue until canceled. Manage or
            cancel a mobile subscription through the Google Play or Apple
            account used to purchase it, and manage a web subscription through
            the applicable web payment provider. Refunds and billing disputes
            are subject to the purchase provider&apos;s rules and applicable law.
            Deleting FamilyPlate or deleting your FamilyPlate account does not
            cancel a subscription.
          </p>
        </TermsSection>

        <TermsSection title="Privacy and Service Providers">
          <p>
            Our Privacy Policy explains how we handle account identifiers,
            contact information, household content, photos, purchases, app
            activity, and diagnostic information. FamilyPlate uses providers
            including OpenAI for requested AI features, RevenueCat for mobile
            subscription access, PostHog for analytics, and Sentry for errors
            and reliability. Your use of third-party stores and services may
            also be subject to their terms and privacy policies.
          </p>
        </TermsSection>

        <TermsSection title="Your Content and Household Sharing">
          <p>
            You retain your rights in content you submit. You give FamilyPlate
            permission to host, process, reproduce, and transmit that content as
            needed to operate and improve the features you request. Only submit
            content you have the right to use.
          </p>
          <p>
            Pantry items, recipes, meal plans, grocery lists, and other content
            may be shared with authenticated members of the same household. Be
            careful when adding sensitive preferences or health-related details
            to a shared household.
          </p>
        </TermsSection>

        <TermsSection title="Account Deletion">
          <p>
            You can delete your account in the mobile app or request deletion
            from our public{" "}
            <Link className="text-primary" href="/delete-account">
              account-deletion page
            </Link>
            . Deletion is permanent. If other authenticated household members
            remain, shared household content may remain available to them. Some
            limited records may be retained for legitimate security, fraud
            prevention, legal, financial, or dispute-resolution purposes as
            described in the Privacy Policy.
          </p>
        </TermsSection>

        <TermsSection title="Service Changes and Availability">
          <p>
            We may update, suspend, or discontinue features, and we may restrict
            access when reasonably necessary to protect users, comply with law,
            enforce these terms, or secure the service. Online, AI, email,
            barcode, and payment features depend on third-party services and may
            occasionally be unavailable.
          </p>
        </TermsSection>

        <TermsSection title="Disclaimer">
          <p>
            To the extent permitted by applicable law, FamilyPlate is provided
            on an &quot;as is&quot; and &quot;as available&quot; basis. We do not
            guarantee that suggestions will be accurate, that every allergen or
            food-safety issue will be detected, or that the service will always
            be uninterrupted or error-free. Nothing in these terms limits rights
            that cannot lawfully be limited.
          </p>
        </TermsSection>

        <TermsSection title="Changes and Contact">
          <p>
            We may update these terms as the service or legal requirements
            change. We will update the date above and provide any additional
            notice required by law. For support or legal questions, contact{" "}
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
