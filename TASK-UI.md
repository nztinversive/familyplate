# Task: Update Plan Page UI + Create Join Page

The backend is already done. You just need to update the frontend.

## Available APIs (already working)

```ts
// Saved recipes
api.mutations.savedRecipes.saveRecipe({ recipeId })
api.mutations.savedRecipes.unsaveRecipe({ recipeId })
api.queries.savedRecipes.getMySavedRecipes  // returns array with { recipeId, recipe, savedByProfile, savedAt }
api.queries.savedRecipes.isRecipeSaved({ recipeId })  // returns boolean

// Swap meal dates
api.mutations.planner.swapMealDates({ mealId, targetMealId })  // swaps the date fields of two meals

// Nutrition is now on recipe objects
// recipe.nutrition?: { calories: number, protein: number, carbs: number, fat: number, fiber?: number }

// Join household
api.queries.households.getHouseholdByInviteCode({ inviteCode })  // returns { name, memberCount } or null
api.mutations.households.joinHousehold({ inviteCode })  // links current user to household
```

## Changes to src/app/(app)/plan/page.tsx

### 1. Add Cookbook Tab (3rd tab)
- Add `BookOpen` or `Heart` icon from lucide-react
- Add third tab "Cookbook" after "Week" and "Recipe Pool" in the Tabs component
- Change TabsList from grid-cols-2 to grid-cols-3
- Query `api.queries.savedRecipes.getMySavedRecipes` 
- In Cookbook tab, show saved recipes similar to Recipe Pool tab
- Each card should have an unsave (heart) button

### 2. Save/Unsave in Recipe Detail Dialog
- Add a heart button in the recipe detail dialog header (next to the title)
- Use `api.queries.savedRecipes.isRecipeSaved` to check state
- Toggle with save/unsave mutations
- Heart filled = saved, heart outline = not saved

### 3. Nutrition Display in Recipe Detail Dialog
- After the header badges and before ingredients, show nutrition if available
- 4-column grid: Calories | Protein | Carbs | Fat
- Simple stat boxes with label on top, value below
- Only show if `selectedRecipe.nutrition` exists

### 4. Swap Meal Dates (Move)
- Add `ArrowLeftRight` icon button on each meal card's action bar (next to shuffle)
- When tapped, set `movingMealId` state to that meal's ID
- All OTHER meal cards get a highlight border (ring-2 ring-primary)
- Tapping another card calls `swapMealDates({ mealId: movingMealId, targetMealId })`
- Tapping the same card or a cancel button clears movingMealId
- While in move mode, show a banner at top: "Tap another meal to swap dates"

### Important
- Keep ALL existing functionality (status change, swap recipe, generate plan, generate grocery, error handling, loading state)
- Do NOT break existing imports or remove existing features
- The plan page already uses: useAction, useMutation, useQuery from convex/react
- Recipe type comes from query results, nutrition field is optional

## Create src/app/join/[inviteCode]/page.tsx

Simple branded join page:
```tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { UtensilsCrossed, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
```

- Use `useParams()` to get inviteCode
- Query `api.queries.households.getHouseholdByInviteCode({ inviteCode })`
- Show household name, member count
- "Join Household" button calls `api.mutations.households.joinHousehold({ inviteCode })`
- After joining, router.push("/plan")
- If not authenticated, show "Sign in first" message
- If invite code invalid, show error
- Nice centered card layout with FamilyPlate branding

## DO NOT
- Change any backend files (they're done and typechecked)
- Remove the TASK.md or TASK-UI.md files
- Change the schema
