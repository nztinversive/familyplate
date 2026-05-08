import Link from "next/link";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
        <Link href="/" className="text-sm font-semibold text-primary">
          FamilyPlate
        </Link>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Support
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            How can we help?
          </h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            For help with your account, subscriptions, pantry, meal plans,
            grocery scanning, or app review access, email FamilyPlate support.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Email
          </p>
          <a
            className="mt-2 block text-2xl font-bold text-primary"
            href="mailto:support@familyplate.co"
          >
            support@familyplate.co
          </a>
          <p className="mt-4 leading-7 text-muted-foreground">
            Include your account email, device type, and a short description of
            what happened. For food allergy or medical diet questions, verify
            with a qualified professional before relying on app suggestions.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/privacy"
            className="rounded-xl border border-border bg-card p-4 font-semibold"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="rounded-xl border border-border bg-card p-4 font-semibold"
          >
            Terms of Service
          </Link>
          <Link
            href="/delete-account"
            className="rounded-xl border border-border bg-card p-4 font-semibold"
          >
            Delete Account
          </Link>
        </div>
      </section>
    </main>
  );
}
