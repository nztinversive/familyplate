You are working on FamilyPlate - a family meal planning PWA built with Next.js 14 (App Router) and Convex and Tailwind and shadcn/ui.

YOUR TASK: Build the Meal Feedback system end-to-end.

The schema already has a mealFeedback table in convex/schema.ts (check it - note there is a typo "oderId" that should probably be "userId" but keep it as-is to avoid migration issues).

Build these things:

1. CONVEX MUTATIONS (convex/mutations/feedback.ts):
   - submitFeedback: takes recipeId and rating (1-5) and liked (boolean) and tags (array of strings) and optional notes. Creates or updates feedback for the current user on that recipe.
   - deleteFeedback: takes feedbackId and deletes it if owned by current user.

2. CONVEX QUERIES (convex/queries/feedback.ts):
   - getMyFeedback: takes recipeId and returns current users feedback for that recipe (or null).
   - getRecipeFeedback: takes recipeId and returns all feedback for a recipe with user names.

3. UI COMPONENT (src/components/feedback/MealFeedbackCard.tsx):
   - A card component that shows after a meal is marked as cooked
   - Star rating (1-5 stars using clickable star icons)
   - Like/dislike toggle (thumbs up/down)
   - Predefined tag chips the user can toggle: "too spicy" and "too bland" and "kid approved" and "make again" and "too much prep" and "great leftovers" and "budget friendly" and "not enough food"
   - Optional notes text area
   - Submit button that calls the submitFeedback mutation
   - If feedback already exists for this recipe show it pre-filled for editing

4. UI COMPONENT (src/components/feedback/RecipeFeedbackSummary.tsx):
   - Small summary component showing average rating and top tags and total reviews
   - Used on the recipe detail page to show aggregate feedback

5. INTEGRATE into the dinner detail page (src/app/(app)/plan/[mealId]/page.tsx):
   - Add the MealFeedbackCard below the recipe details
   - Add the RecipeFeedbackSummary near the top of the recipe info

Keep the existing design system (emerald theme and shadcn/ui and mobile-first 430px max-width). Use lucide-react icons (Star and ThumbsUp and ThumbsDown etc).
