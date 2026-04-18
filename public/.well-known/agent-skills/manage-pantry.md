# FamilyPlate: Manage Pantry

Add, update, or remove items in the household's pantry.

## When to use this skill

Use when the user asks things like:
- "Add 2 lbs chicken, milk, and 3 onions to my pantry"
- "I used up the rice"
- "What's in my pantry?"

## Inputs (add)

- `items` (array) — Each item has `name`, `quantity`, `unit`, `category`.
  Supports natural-language batch input: `"2 lbs chicken, milk, 3 onions"`.

## Behavior

- Add items in bulk via quick-add input
- Adjust quantities up or down
- Remove items that are used up
- Categorize by Produce, Meat, Dairy, Grains, etc.
- Set storage location (Pantry, Fridge, Freezer)

## Entry point

`https://familyplate.co/pantry`

Also available as WebMCP tools: `addPantryItem`, `adjustPantryQuantity`,
`removePantryItem`, `listPantry`.
