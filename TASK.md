# Task: Build 4 Features for FamilyPlate

Stack: Next.js 14 (App Router) + Convex + Tailwind + shadcn/ui
Repo: C:\Users\Atlas-playground\.openclaw\workspace\familyplate

## Feature 1: Recipe Favorites / Cookbook

### Schema
Add to `convex/schema.ts`:
```ts
savedRecipes: defineTable({
  householdId: v.id("households"),
  recipeId: v.id("recipeSuggestions"),
  savedBy: v.id("userProfiles"),
  savedAt: v.number(),
})
  .index("by_householdId", ["householdId"])
  .index("by_recipeId", ["recipeId"]),
```

### Backend
Create `convex/mutations/savedRecipes.ts`:
- `saveRecipe` mutation — save a recipe to cookbook
- `unsaveRecipe` mutation — remove from cookbook

Create `convex/queries/savedRecipes.ts`:
- `getMySavedRecipes` query — get all saved recipes for user's household (join with recipeSuggestions)
- `isRecipeSaved` query — check if a specific recipe is saved

### Frontend
- Add a heart/bookmark icon to the recipe detail dialog in `src/app/(app)/plan/page.tsx` — tap to save/unsave
- Add a "Cookbook" tab in plan page's Tabs (third tab after "Week" and "Recipe Pool") showing all saved recipes
- Each saved recipe card should have an "Add to Plan" button (future: for now just show them)

## Feature 2: Nutritional Info

### Backend
Update the recipe schema in `convex/schema.ts` to add nutritional fields to `recipeSuggestions`:
```ts
nutrition: v.optional(v.object({
  calories: v.number(),
  protein: v.number(),
  carbs: v.number(),
  fat: v.number(),
  fiber: v.optional(v.number()),
})),
```

Update `convex/actions/generateMealPlan.ts`:
- Add nutritional fields to the JSON schema sent to OpenAI (inside recipeSchema)
- Add these fields: calories (number), protein (number), carbs (number), fat (number), fiber (number)
- Map them through in sanitizeRecipe or after
- Save them to the recipe when inserting into recipeSuggestions

Update `convex/lib/openaiMealPlanner.ts`:
- Update the RawRecipe type to include optional nutrition fields
- Update sanitizeRecipe to pass through nutrition data

### Frontend
- In the recipe detail dialog (`plan/page.tsx`), add a "Nutrition" section between the header and ingredients
- Show calories, protein, carbs, fat in a 4-column grid with circular progress indicators or simple stats
- Keep it compact — 4 numbers in a row

## Feature 3: Drag to Reorder Meals

This is complex for mobile. Instead, implement a simpler "swap two meals" approach:
- Add a "Move" button next to each meal card
- When tapped, highlight all other meals as drop targets
- Tap another meal to swap their dates

### Backend
Add `convex/mutations/planner.ts`:
- `swapMealDates` mutation — takes two mealIds, swaps their `date` fields

### Frontend
- Add a move/swap icon button to each meal card
- When in "swap mode", other cards get a highlight border
- Tapping another card swaps the two meals' dates
- Cancel by tapping the same card again

## Feature 4: Invite/Sharing Flow

When a family member gets an invite email, they need a proper onboarding experience.

### What exists
- `convex/actions/sendInviteEmail.ts` — sends email with invite code
- `convex/schema.ts` — households have `inviteCode` field
- Settings page has "Add Family Member" with email

### What's needed

Create `src/app/join/[inviteCode]/page.tsx`:
- Landing page: "You've been invited to join [household name]!"
- Shows household name and who invited them
- "Join Household" button
- After clicking, they sign in (or create account) and their profile gets linked to the household

### Backend
Create `convex/queries/households.ts` (add to existing):
- `getHouseholdByInviteCode` query — public query, returns household name + member count for the invite page

Create `convex/mutations/households.ts` (add to existing):
- `joinHousehold` mutation — takes inviteCode, links current user's profile to that household

### Frontend
- Create the join page at `src/app/join/[inviteCode]/page.tsx`
- Nice branded page with FamilyPlate logo
- Show household name and "Join" CTA
- After joining, redirect to /plan

## Important Notes
- Use `npx convex dev --typecheck=enable --once` to typecheck after changes
- PowerShell: use `;` not `&&` 
- Convex actions need `"use node";` at top
- TypeScript: use `Array.from()` instead of spreading Map iterators (no downlevelIteration)
- Test with `npm run build` before deploying
- Schema fields that might not exist on old data should be `v.optional()`
- The recipe detail dialog is at the bottom of `src/app/(app)/plan/page.tsx`
- The existing settings page is at `src/app/(app)/settings/page.tsx`
- Existing household queries/mutations are in `convex/queries/households.ts` and `convex/mutations/households.ts`
