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
            Last updated August 19, 2026.
          </p>
          <p className="mt-4 leading-7 text-muted-foreground">
            This policy explains how FamilyPlate handles information in its
            Android and iOS apps, website, and related support services.
          </p>
        </div>

        <PolicySection title="Information You Provide">
          <p>
            We collect account and household information such as your name,
            email address, account identifier, household name, and household
            membership. A household organizer may also enter profiles for other
            household members, including names, ages, dietary preferences,
            allergies, dislikes, weight, activity level, and meal or nutrition
            goals. FamilyPlate is designed for adults and is not intended for
            children to use independently.
          </p>
          <p>
            We store the content needed to provide the service, including pantry
            items, barcode values, grocery lists, recipes, meal plans, cooking
            history, ratings, feedback, prompts, invite information, and agent
            connection settings.
          </p>
        </PolicySection>

        <PolicySection title="Photos, Camera, and Barcode Scanning">
          <p>
            Camera access is optional and is requested when you choose a
            scanning feature. Barcode values may be sent to Open Food Facts to
            look up product details. When you choose grocery-photo recognition,
            the selected image and related request may be sent to OpenAI to
            identify possible grocery items. FamilyPlate does not use the camera
            in the background.
          </p>
        </PolicySection>

        <PolicySection title="AI Processing">
          <p>
            FamilyPlate uses OpenAI to help generate meal plans, dinner ideas,
            recipe content, and grocery recognition. Depending on the feature,
            this may include pantry items, recipes, household preferences,
            dietary notes, allergies, dislikes, prompts, and grocery photos. The
            mobile app asks for permission before sending this information for
            an AI request, and that permission can be reset in Settings.
          </p>
          <p>
            AI can make mistakes. Always verify ingredients, package labels,
            preparation instructions, and allergy safety before cooking or
            serving food. FamilyPlate is not a medical device and does not
            diagnose, treat, cure, or prevent any medical condition.
          </p>
        </PolicySection>

        <PolicySection title="Purchases and Subscriptions">
          <p>
            Android subscriptions are purchased through Google Play, iOS
            subscriptions are purchased through Apple, and web purchases may be
            processed by a web payment provider. RevenueCat helps FamilyPlate
            manage mobile subscription products and entitlements. FamilyPlate
            and RevenueCat may receive account identifiers, product and store
            identifiers, entitlement status, purchase status, and expiration or
            renewal information. FamilyPlate does not receive the complete card
            or bank-account details you provide directly to a store or payment
            processor.
          </p>
        </PolicySection>

        <PolicySection title="Analytics and Diagnostics">
          <p>
            We use PostHog to understand screen visits, feature use, app
            lifecycle events, and interactions. Identified analytics may include
            your FamilyPlate user identifier, email address, profile name, app
            version, build, platform, and event details.
          </p>
          <p>
            We use Sentry for crash reporting, error diagnosis, performance,
            and reliability. Diagnostic information may include your user
            identifier, email address, profile name, error messages, stack
            traces, app version and build, operating system, device or browser
            information, network information such as an IP address, and the
            screen or feature involved. These services may use browser, device,
            or installation identifiers to provide their services.
          </p>
        </PolicySection>

        <PolicySection title="Public Website Features">
          <p>
            If you use a public dinner generator without signing in, we may
            process the pantry text, allergies, craving, generated suggestions,
            source page, and a privacy-preserving network or browser fingerprint
            used for rate limiting, security, and aggregate product analytics.
          </p>
        </PolicySection>

        <PolicySection title="How We Use Information">
          <p>
            We use information to create and secure accounts, operate household
            features, generate and personalize meal content, recognize
            groceries, manage subscriptions, send sign-in and household-invite
            emails, provide support, prevent abuse, diagnose failures, and
            understand and improve FamilyPlate.
          </p>
        </PolicySection>

        <PolicySection title="Service Providers and Disclosures">
          <p>
            We disclose information as needed to companies that operate
            FamilyPlate on our behalf. These include Convex for application data
            and authentication, Render for website hosting, OpenAI for AI
            features, RevenueCat and the applicable app store or payment
            provider for subscriptions, PostHog for analytics, Sentry for
            diagnostics, Resend for service emails, and Open Food Facts for
            barcode lookup. Each provider receives information applicable to
            the service it performs and handles it under its own terms and
            privacy commitments.
          </p>
          <p>
            We may also disclose information when reasonably necessary to obey
            law, protect users or the service, investigate abuse or fraud, or
            complete a business transaction subject to appropriate safeguards.
            We do not use your FamilyPlate content to serve third-party ads.
          </p>
        </PolicySection>

        <PolicySection title="Retention and Account Deletion">
          <p>
            We keep account and household information while it is needed to
            provide FamilyPlate. You can request deletion in the mobile app at
            Settings &gt; Privacy &amp; Account &gt; Delete Account, or through our
            public{" "}
            <Link className="text-primary" href="/delete-account">
              account-deletion page
            </Link>
            . We may verify that a request comes from the account owner.
          </p>
          <p>
            Deletion removes the sign-in account and personal profile from the
            active FamilyPlate service. If no other authenticated household
            member remains, the active household pantry, recipes, meal plans,
            grocery lists, and household profiles are also removed. If other
            authenticated members remain, shared household content may remain
            available to them.
          </p>
          <p>
            Limited records may be retained when reasonably necessary for
            security, fraud prevention, legal compliance, financial
            recordkeeping, dispute resolution, or enforcing our terms. Provider
            logs and backup copies may take additional time to expire under
            provider retention schedules. Google, Apple, RevenueCat, and other
            payment providers may retain transaction records under their own
            legal obligations and policies. Contact us if you want help with a
            provider-specific deletion request.
          </p>
          <p>
            Deleting a FamilyPlate account does not cancel a subscription. You
            must cancel it through the store or payment provider where it was
            purchased.
          </p>
        </PolicySection>

        <PolicySection title="Security and Processing Locations">
          <p>
            We use encrypted network connections and access controls intended to
            protect information. No service can guarantee absolute security.
            FamilyPlate and its providers may process information in the United
            States and other countries where they operate, subject to applicable
            legal safeguards.
          </p>
        </PolicySection>

        <PolicySection title="Your Choices">
          <p>
            You can choose whether to use camera, barcode, grocery-photo, and AI
            features. You can reset AI permission in the mobile app and use the
            account-deletion paths described above. Device-level permissions can
            also be changed in Android or iOS settings.
          </p>
        </PolicySection>

        <PolicySection title="Contact">
          <p>
            For privacy questions or requests, contact{" "}
            <a className="text-primary" href="mailto:support@familyplate.co">
              support@familyplate.co
            </a>
            . Do not send your password or payment-card details.
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
