# AI content reporting operations

Authenticated household members can report generated recipes from Tonight,
Weekly Plan, Cookbook, and Recently Cooked without leaving the mobile app. The
backend verifies that the recipe belongs to the reporter's household and that
its source is `ai`; clients cannot report another household's content or label a
curated/custom recipe as generated content.

Each report stores a bounded snapshot of the generated recipe so it remains
reviewable if the source suggestion is later replaced. It does not copy profile,
email, pantry, or payment data. Repeated reports by the same person for the same
recipe update the pending report instead of creating unbounded duplicates.

A trusted moderation worker should use the internal functions
`internal.aiContentReports.listPendingAiContentReports` and
`internal.aiContentReports.resolveAiContentReport`. Review allergy and food
safety reports first, then inappropriate, inaccurate, and other reports. Never
expose these internal functions to a mobile or browser client.
