You are working on FamilyPlate - a family meal planning PWA built with Next.js 14 (App Router) and Convex and Tailwind and shadcn/ui.

YOUR TASK: Build the AI-powered dinner planning engine using OpenAI API.

Read the existing Convex schema (convex/schema.ts) to understand the data model. Pay attention to recipeSuggestions and weeklyMealPlans and plannedMeals and pantryItems and userProfiles tables.

Build these things:

1. CONVEX ACTION (convex/actions/generateMealPlan.ts) - A Convex action that takes a week start date and household ID. It should fetch all pantry items (prioritize items near expiration) and fetch all user profiles in the household (dietary prefs and allergies and dislikes). Then call OpenAI API to generate 7 dinner suggestions (one per night) with 2 alternatives each. Each suggestion needs a name and ingredients list with quantities and brief instructions and effort level (easy or medium or hard) and estimated time and tags and which pantry items it uses. The prompt should emphasize using pantry items first and respecting dietary restrictions and varying cuisine across the week. Store results as recipeSuggestions and create a weeklyMealPlan with plannedMeals. OpenAI API key should be set as a Convex environment variable.

2. CONVEX ACTION (convex/actions/swapMeal.ts) - Regenerate a single meal slot with 3 new alternatives.

3. CONVEX ACTION (convex/actions/generateGroceryList.ts) - Auto-generate grocery list by comparing planned meal ingredients against pantry inventory and group by category.

4. UI COMPONENT (src/components/plan/GeneratePlanButton.tsx) - Button that triggers meal plan generation with loading state.

5. DINNER DETAIL PAGE (src/app/(app)/plan/[mealId]/page.tsx) - Show full recipe detail with ingredients and instructions and effort and time and swap button.

Use gpt-4o-mini for cost efficiency. Handle errors gracefully. Use structured JSON output from OpenAI.
