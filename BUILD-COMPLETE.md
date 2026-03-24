# FamilyPlate — Week 1 Build Summary

## What Was Built

### Project Scaffold
- Next.js 14 project structure with App Router, TypeScript, Tailwind CSS
- shadcn/ui component system with custom emerald/food-friendly color scheme
- `.npmrc`, `.gitignore`, `.eslintrc.json`, `components.json`
- `render.yaml` for Render deployment

### Convex Data Model (`convex/schema.ts`)
Full schema with 8 tables and proper indexes:
- `households` — name, invite code, creator
- `userProfiles` — auth, dietary prefs, allergies, dislikes, goals
- `pantryItems` — name, quantity, category, storage location, expiration
- `recipeSuggestions` — ingredients, instructions, effort level, tags
- `weeklyMealPlans` — week start date, status
- `plannedMeals` — recipe, date, meal type, status
- `groceryLists` — items with check-off support
- `mealFeedback` — ratings, tags, notes per user

### Convex Functions
- **Mutations:** createHousehold, joinHousehold, updateProfile, addFamilyMember
- **Queries:** getHousehold, getHouseholdByInviteCode, getMyHousehold, getMyProfile, getProfiles, getPantryItems
- **Auth config:** Placeholder for Convex Auth + Resend magic link

### UI Screens
1. **Welcome / Sign In** (`/`) — Hero, email input, magic link CTA
2. **Household Setup** (`/setup/household`) — Create or join wizard with invite code
3. **Profile Setup** (`/setup/profile`) — 3-step wizard: name/dietary, allergies/dislikes, family members
4. **Pantry Home** (`/(app)/pantry`) — Empty state, search, storage location tabs
5. **Weekly Plan** (`/(app)/plan`) — Placeholder with empty state
6. **Grocery List** (`/(app)/grocery`) — Placeholder with empty state
7. **Settings** (`/(app)/settings`) — Profile, household, notifications, sign out

### Layout & Navigation
- `AppShell` — Mobile-first shell with header + bottom nav
- `MobileNav` — Fixed bottom bar: Pantry, Plan, Grocery, Settings
- `PageHeader` — Consistent header with title/subtitle/action
- Max width 430px centered, safe area support

### PWA
- `manifest.json` — Standalone display, emerald theme
- `sw.js` — Basic service worker with network-first
- Meta tags in layout for Apple Web App

### shadcn/ui Components
Button, Input, Card, Label, Tabs, Badge, Separator

## Still Needed (Next Steps)
1. `npm install` and `npx convex dev` to generate types
2. Real Convex Auth integration (magic link + Resend)
3. Git init, commit, and push to `nztinversive/familyplate`
4. Generate real app icons (192, 512, apple-touch)
5. Wire up Convex mutations/queries to UI screens
6. `_generated/` Convex types (auto-generated on first `convex dev`)
