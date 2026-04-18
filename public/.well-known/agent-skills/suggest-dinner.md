# FamilyPlate: Suggest Tonight's Dinner

Suggest 3 dinner recipes to cook tonight using ingredients already in the user's
pantry.

## When to use this skill

Use when the user asks things like:
- "What should I cook tonight?"
- "I'm in the mood for chicken — any dinner ideas?"
- "Use up what I have in the pantry"

## Inputs

- `craving` (optional, string) — User's mood or craving. Examples: "Chicken",
  "Pasta", "something spicy", "Thai".

## Behavior

1. Read the household's pantry items, household allergies, and dislikes.
2. Generate 3 dinner recipes that prioritize pantry items and respect all
   allergies (strict, life-threatening) and dislikes.
3. Return recipes with name, description, effort level, time, servings,
   ingredient list (with `inPantry` flags), and step-by-step instructions.
4. Persist suggestions so they survive browser tab navigation.

## Entry point

`https://familyplate.co/tonight`

Also available as a WebMCP tool: `suggestDinner`.

## Safety

Allergies are life-threatening — always strictly enforced server-side with
derivative mapping for 10+ allergen categories.
