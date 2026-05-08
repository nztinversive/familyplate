import Link from "next/link";

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
        <Link href="/" className="text-sm font-semibold text-primary">
          FamilyPlate
        </Link>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Account Deletion
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Delete your FamilyPlate account
          </h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            You can delete your account directly from the FamilyPlate mobile app.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold">In the mobile app</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 leading-7 text-muted-foreground">
            <li>Open FamilyPlate and sign in.</li>
            <li>Go to Settings.</li>
            <li>Open Privacy & Account.</li>
            <li>Tap Delete Account and confirm.</li>
          </ol>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold">What gets deleted</h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Account deletion removes your sign-in account and personal profile
            data. If you are the only signed-in member of a household, the
            household pantry, recipes, meal plans, grocery lists, and managed
            profiles are also deleted. If other signed-in members remain,
            shared household data may remain available to them.
          </p>
        </div>

        <p className="leading-7 text-muted-foreground">
          Need help? Contact{" "}
          <a className="text-primary" href="mailto:support@familyplate.co">
            support@familyplate.co
          </a>
          .
        </p>
      </section>
    </main>
  );
}
