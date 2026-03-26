You are working on FamilyPlate - a family meal planning PWA built with Next.js 14 (App Router) and Convex and Tailwind and shadcn/ui.

YOUR TASK: Wire up all existing Convex mutations and queries to the UI screens. The data layer exists but the screens show empty placeholder states.

Read the Convex schema (convex/schema.ts) and existing mutations (convex/mutations/) and queries (convex/queries/) and the current UI pages first.

Do these things:

1. PANTRY PAGE - Wire up pantry CRUD. Add and edit and delete items. Quantity tracking. Expiration dates. Storage location tabs (fridge and freezer and pantry) that actually filter data. Create an Add Item dialog with manual entry form for name and quantity and category and storage location and expiration date.

2. GROCERY LIST PAGE - Wire up grocery list. Display items grouped by category. Check-off support. Ability to manually add items.

3. WEEKLY PLAN PAGE - Wire up the plan page to display planned meals from Convex organized by day of week and meal slot (dinner only for MVP).

4. SETTINGS PAGE - Wire up profile display and household info from Convex queries.

Add any missing Convex functions you need (new queries and mutations for pantry CRUD and grocery operations etc).

Make sure all components use the ConvexProvider and proper Convex React hooks (useQuery and useMutation). Keep the existing design system (emerald theme and shadcn/ui components and mobile-first 430px max-width).
