# FamilyPlate: Generate Weekly Meal Plan

Generate a personalized 7-night dinner plan for the household.

## When to use this skill

Use when the user asks things like:
- "Plan my dinners for the week"
- "Generate this week's meal plan"
- "Make me a week of dinners"

## Inputs

None required. Uses the household's:
- Pantry items (prioritized)
- Dietary preferences
- Allergies and dislikes (strict)
- Past meal feedback (favorites and dislikes)

## Behavior

1. Read pantry, profiles, and feedback history.
2. Generate 7 dinner recipes — one per day with 2 alternatives each.
3. Vary cuisines, proteins, and cooking methods across the week.
4. Apply server-side safety filter for allergens and dislikes.
5. Save to database and return the plan ID.

## Entry point

`https://familyplate.co/plan`

Also available as a WebMCP tool: `generatePlan`.

## Safety

Allergies are strictly enforced with derivative mapping. Dislikes are filtered
out before the plan is saved.
