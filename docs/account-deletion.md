# Account deletion operations

FamilyPlate deletes the authenticated Convex account and its owned application
records in one transaction. If no other authenticated household member remains,
the transaction also deletes the household pantry, recipes, saved recipes, meal
plans, grocery lists, feedback, AI-content reports, managed profiles, and agent
connections. If another authenticated member remains, only the departing
member's profile, saved recipes, feedback, pantry additions, AI-content reports,
and agent connections are deleted. Recipes the member created stay with the
household but no longer retain their profile ID.

The transaction has an explicit safety ceiling. If an account is unusually
large, deletion stops without partially deleting data and directs the person to
`support@familyplate.co` for assisted deletion.

## Third-party cleanup queue

Deleting the local account creates one `accountDeletionHandoffs` row for each
known PostHog, Sentry, and RevenueCat user identifier. The queue intentionally
does not store an email address, name, report text, pantry data, or other account
content. Pending rows are not automatically purged, so an unprocessed deletion
request cannot disappear.

A trusted operator or credentialed worker should:

1. Read pending rows ordered by `requestedAt`.
2. Submit deletion for `externalUserId` to the named provider.
3. Mark the handoff `processed`, or mark it `failed` with a short operational
   reason. Never place credentials or personal account content in that reason.
4. Purge processed rows after `retentionUntil`. Failed and pending rows remain
   available for retry. The default handoff retention window is 90 days.

The backend exposes only internal functions for these maintenance steps:
`internal.accountDeletion.listPendingDeletionHandoffs`,
`internal.accountDeletion.resolveDeletionHandoff`, and
`internal.accountDeletion.purgeExpiredDeletionHandoffs`. Do not expose these
functions directly to a mobile or browser client. Until a credentialed worker is
connected, operators must reconcile this queue through authenticated provider
and Convex administration tools.

## Verification checklist

- Confirm the user can no longer authenticate after deletion.
- Confirm the deleted profile has no saved recipes, feedback, pantry items,
  content reports, recipe creator references, or agent connections.
- When the last authenticated member leaves, confirm no household-owned records
  remain.
- Confirm every expected provider identifier has a pending handoff and that no
  handoff contains an email or display name.
- Confirm a remaining household has an administrator after its creator leaves.
