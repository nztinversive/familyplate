# FamilyPlate: Agent CLI Setup

Connect a trusted coding or terminal agent to a user's FamilyPlate household without
sharing the user's password, browser session, Convex admin access, or household
invite code.

## When to use this skill

Use this when the user asks an agent to:

- Review pantry, fridge, or freezer items
- Read the grocery list
- Read the active dinner plan
- Read saved cookbook recipes
- Add a grocery item after confirmation
- Update grocery quantity, category, unit, or checked state after confirmation
- Check off a grocery item after confirmation
- Add, update, or remove pantry items after confirmation
- Add or remove planned dinners after confirmation
- Create saved cookbook recipes after confirmation

Do not use this for password login, account management, subscription management,
medical or nutrition advice, or anything the user did not explicitly authorize.

## User setup

1. Ask the user to sign in at `https://familyplate.co`.
2. Ask the user to open Settings.
3. In Agent Access, ask the user to create a named connection.
4. Ask the user to enable only the write scopes needed for the task.
5. Ask the user to choose an expiration: 1 hour, 24 hours, 7 days, or no expiration.
6. Ask the user to copy the one-time connection command.
7. Run the command in the terminal where the agent operates.
8. Run `familyplate doctor --pretty` before doing useful work.

## Sign-in rules

- Do not ask for the user's FamilyPlate password.
- Do not automate the user's browser login unless the user explicitly asks for a
  browser walkthrough.
- The user owns sign-in. The agent owns CLI setup after the user provides the
  generated terminal command.
- If the user is not signed in, send them to `https://familyplate.co` and ask
  them to open Settings after sign-in.
- If the token is missing, expired, revoked, or has the wrong scope, ask the user
  to create a new Agent Access connection in Settings.

## Install

Use the published CLI:

```bash
npx @familyplate/cli@latest instructions
npx @familyplate/cli@latest connect --api-url https://effervescent-gecko-133.convex.site --token fp_agent_...
npx @familyplate/cli@latest doctor --pretty
```

Or install it globally:

```bash
npm install -g @familyplate/cli
familyplate connect --api-url https://effervescent-gecko-133.convex.site --token fp_agent_...
familyplate doctor --pretty
```

The token is shown once in FamilyPlate Settings. Never ask the user to paste a
token into chat if a local terminal command is available.

## Local config

The CLI stores local config in `~/.familyplate/agent.json` with file mode `0600`.
Agents can inspect local config without printing the token:

```bash
familyplate config --pretty
```

Agents can remove local config when done:

```bash
familyplate disconnect --pretty
```

`disconnect` only removes local CLI config. The user revokes server-side access
from FamilyPlate Settings.

## Safe commands

```bash
familyplate config --pretty
familyplate doctor --pretty
familyplate status --pretty
familyplate tools --pretty
familyplate pantry list --pretty
familyplate pantry list --location fridge --pretty
familyplate pantry list --location freezer --pretty
familyplate grocery list --pretty
familyplate plan list --pretty
familyplate recipes list --pretty
```

## Write commands

Writes require explicit user intent and `--confirm`. Use `--dry-run` first when
the target item is ambiguous.

```bash
familyplate grocery add "olive oil" --quantity 1 --unit bottle --category Pantry --dry-run --pretty
familyplate grocery add "olive oil" --quantity 1 --unit bottle --category Pantry --confirm --pretty
familyplate grocery update "olive oil" --quantity 2 --category Condiments --dry-run --pretty
familyplate grocery update "olive oil" --quantity 2 --category Condiments --confirm --pretty
familyplate grocery check "Tomatoes" --dry-run --pretty
familyplate grocery check "Tomatoes" --confirm --pretty
familyplate pantry add "Chicken thighs" --quantity 2 --unit lb --category Meat --location fridge --dry-run --pretty
familyplate pantry add "Chicken thighs" --quantity 2 --unit lb --category Meat --location fridge --confirm --pretty
familyplate pantry update --item-id <pantry_item_id> --quantity 1 --dry-run --pretty
familyplate pantry remove --item-id <pantry_item_id> --dry-run --pretty
familyplate plan add --recipe-id <recipe_id> --date 2026-06-15 --dry-run --pretty
familyplate plan remove --meal-id <planned_meal_id> --dry-run --pretty
familyplate recipes create --input '{"title":"Black Bean Tacos","ingredients":[{"name":"Black beans","quantity":1,"unit":"can"}],"instructions":["Warm beans and tortillas."],"effortLevel":"easy","estimatedTime":15,"servings":4}' --dry-run --pretty
```

## Scopes

Read-only connections include:

- `read:profile`
- `read:pantry`
- `read:grocery`
- `read:plan`
- `read:recipes`

Optional write scope:

- `write:grocery`
- `write:pantry`
- `write:plan`
- `write:recipes`

If a command fails because of missing scope, ask the user to create or update an
Agent Access connection with the needed scope.

## Tool registry

The public tool registry is available at:

```text
https://effervescent-gecko-133.convex.site/api/agent/tools
```

Current tools:

- `whoami` - show the FamilyPlate profile and household for the connection.
- `listPantry` - list pantry, fridge, and freezer items.
- `listGroceryList` - read the grocery list.
- `listMealPlan` - read the active 7-night dinner plan.
- `listSavedRecipes` - list saved cookbook recipes.
- `addGroceryItem` - add one grocery item; requires `write:grocery` and confirmation.
- `updateGroceryItem` - update grocery quantity, unit, category, or checked state; requires `write:grocery` and confirmation.
- `checkGroceryItem` - check off one grocery item by exact name; requires `write:grocery` and confirmation.
- `addPantryItem` - add a pantry, fridge, or freezer item; requires `write:pantry` and confirmation.
- `updatePantryItem` - update a pantry item by id; requires `write:pantry` and confirmation.
- `removePantryItem` - remove a pantry item by id; requires `write:pantry` and confirmation.
- `addMealToPlan` - add or replace a planned dinner; requires `write:plan` and confirmation.
- `removeMealFromPlan` - remove a planned dinner; requires `write:plan` and confirmation.
- `createSavedRecipe` - create a saved cookbook recipe; requires `write:recipes` and confirmation.

## Safety rules

- Use read commands freely to understand the user's household food context.
- Never ask for or store the user's FamilyPlate password.
- Never perform writes unless the user explicitly asks for that action.
- Prefer `--dry-run` before writes when the item is ambiguous.
- Use `--confirm` only after the user confirms the exact change.
- Do not provide diagnosis, treatment, or medical nutrition advice.
- Tell the user to revoke the connection in Settings when the agent is done.

## Human documentation

- Agent setup page: `https://familyplate.co/agents`
- Agent manifest: `https://familyplate.co/.well-known/familyplate-agent.json`
- Agent skills index: `https://familyplate.co/.well-known/agent-skills/index.json`
