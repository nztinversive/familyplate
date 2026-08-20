import Link from "next/link";

const deletionRequestUrl =
  "mailto:support@familyplate.co?subject=FamilyPlate%20account%20deletion%20request&body=Please%20delete%20my%20FamilyPlate%20account%20and%20associated%20data.%20The%20email%20address%20on%20my%20account%20is%3A%20";

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
        <Link href="/" className="text-sm font-semibold text-primary">
          FamilyPlate
        </Link>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Account and Data Deletion
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Delete your FamilyPlate account
          </h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            Delete your account immediately in the mobile app, or send a
            deletion request from this page if you no longer have access to the
            app. Both paths request deletion of the FamilyPlate account and its
            associated personal data.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold">Delete in the mobile app</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 leading-7 text-muted-foreground">
            <li>Open FamilyPlate and sign in.</li>
            <li>Go to Settings.</li>
            <li>Open Privacy &amp; Account.</li>
            <li>Tap Delete Account and confirm.</li>
          </ol>
        </div>

        <div
          id="request-deletion"
          className="rounded-2xl border border-primary/30 bg-card p-6"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            No app access required
          </p>
          <h2 className="mt-2 text-xl font-bold">Request deletion by email</h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Email us from the address on your FamilyPlate account, or include
            that account email in your message. Ask us to delete your
            FamilyPlate account and associated data. We may reply to verify that
            you own the account before completing the request.
          </p>
          <a
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
            href={deletionRequestUrl}
          >
            Email an account-deletion request
          </a>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Do not send your password, payment-card number, or grocery photos.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold">What deletion affects</h2>
          <div className="mt-4 space-y-3 leading-7 text-muted-foreground">
            <p>
              FamilyPlate removes the sign-in account and personal profile from
              the active service. If you are the only authenticated member of a
              household, the household pantry, recipes, meal plans, grocery
              lists, and household profiles are also removed. Account-linked
              agent connections and access tokens are removed in both cases.
            </p>
            <p>
              If other authenticated members remain, shared household content
              may remain available to them. Deletion requests for account-linked
              analytics, monitoring, and subscription identifiers are queued
              for staff or provider processing. Limited records may also be
              retained when reasonably necessary for security, fraud prevention,
              legal compliance, financial recordkeeping, or dispute resolution.
              See the{" "}
              <Link className="text-primary" href="/privacy">
                Privacy Policy
              </Link>{" "}
              for details.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold">Cancel subscriptions separately</h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Deleting your FamilyPlate account does not cancel an active
            subscription. Cancel it through Google Play, Apple, or the web
            payment provider where you purchased it. Those providers may retain
            transaction records under their own policies and legal obligations.
          </p>
        </div>

        <p className="leading-7 text-muted-foreground">
          Questions about a request? Contact{" "}
          <a className="text-primary" href="mailto:support@familyplate.co">
            support@familyplate.co
          </a>
          .
        </p>
      </section>
    </main>
  );
}
