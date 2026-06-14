# FamilyPlate Agent Controls

FamilyPlate exposes a small, scoped control surface for trusted agents. The goal
is to let a user connect an agent to their household without sharing their
password, browser session, Convex admin access, or household invite code.

## User Connection Flow

1. Sign in to FamilyPlate.
2. Open Settings.
3. In Agent Access, create a connection.
4. Copy the command while it is visible. The token is shown once.
5. Run the command wherever the agent will operate.

For this repo, the local command is:

```bash
npm run familyplate -- connect --api-url https://your-convex-deployment.convex.site --token fp_agent_...
```

For users or agents outside this repo, install or invoke the published CLI from
npm:

```bash
npx @familyplate/cli@latest connect --api-url https://your-convex-deployment.convex.site --token fp_agent_...
npx @familyplate/cli@latest doctor --pretty
```

Or install it globally:

```bash
npm install -g @familyplate/cli
familyplate connect --api-url https://your-convex-deployment.convex.site --token fp_agent_...
familyplate doctor --pretty
```

Release the npm packages from this repo with:

```bash
npm run agent:publish
```

The packages must be published before `npx @familyplate/cli@latest` works.

For agent setup, prefer direct `npm exec` so output is less likely to include
extra npm lifecycle text:

```bash
npm exec --workspace=@familyplate/cli familyplate -- connect --api-url https://your-convex-deployment.convex.site --token fp_agent_...
```

If the CLI is installed globally or published as `familyplate`, the command is:

```bash
familyplate connect --api-url https://your-convex-deployment.convex.site --token fp_agent_...
```

The CLI stores the connection in `~/.familyplate/agent.json` with file mode
`0600`. Agents can also use environment variables instead of local storage:

```bash
export FAMILYPLATE_AGENT_API_URL=https://your-convex-deployment.convex.site
export FAMILYPLATE_AGENT_TOKEN=fp_agent_...
```

Inspect local configuration without printing the token:

```bash
familyplate config --pretty
```

Remove local CLI configuration when an agent is done:

```bash
familyplate disconnect --pretty
```

`disconnect` only removes the local config file. Users still revoke server-side
agent access from FamilyPlate Settings.

## Current Tools

The first pass is intentionally practical and narrow:

```bash
npm run familyplate -- config --pretty
npm run familyplate -- doctor --pretty
npm run familyplate -- disconnect --pretty
npm run familyplate -- status --pretty
npm run familyplate -- tools --pretty
npm run familyplate -- pantry list --pretty
npm run familyplate -- pantry list --location fridge --pretty
npm run familyplate -- pantry add "Chicken thighs" --quantity 2 --unit lb --category Meat --location fridge --dry-run --pretty
npm run familyplate -- pantry update --item-id <pantry_item_id> --quantity 1 --dry-run --pretty
npm run familyplate -- pantry remove --item-id <pantry_item_id> --dry-run --pretty
npm run familyplate -- grocery list --pretty
npm run familyplate -- grocery check "Tomatoes" --dry-run --pretty
npm run familyplate -- grocery check "Tomatoes" --confirm --pretty
npm run familyplate -- grocery update "Tomatoes" --quantity 6 --category Produce --dry-run --pretty
npm run familyplate -- plan list --pretty
npm run familyplate -- plan add --recipe-id <recipe_id> --date 2026-06-15 --dry-run --pretty
npm run familyplate -- plan remove --meal-id <planned_meal_id> --dry-run --pretty
npm run familyplate -- recipes list --pretty
npm run familyplate -- recipes create --input '{"title":"Black Bean Tacos","ingredients":[{"name":"Black beans","quantity":1,"unit":"can"}],"instructions":["Warm beans and tortillas."],"effortLevel":"easy","estimatedTime":15,"servings":4}' --dry-run --pretty
```

The repository includes a smoke check for the public agent API and local CLI:

```bash
npm run agent:smoke
```

To include live read checks, run it with a real token:

```bash
FAMILYPLATE_AGENT_API_URL=https://your-convex-deployment.convex.site \
FAMILYPLATE_AGENT_TOKEN=fp_agent_... \
npm run agent:smoke
```

Agents should run diagnostics before doing useful work:

```bash
npm run familyplate -- doctor --pretty
```

Agents can print a self-contained quickstart with command examples and tool
JSON shapes:

```bash
npm run familyplate -- instructions
npm run familyplate -- instructions --json --pretty
```

Grocery writes require an explicit confirmation flag:

```bash
npm run familyplate -- grocery add "olive oil" --quantity 1 --unit bottle --category Condiments --dry-run --pretty
npm run familyplate -- grocery add "olive oil" --quantity 1 --unit bottle --category Condiments --confirm --pretty
```

Agents can use the lower-level runner for exact JSON input:

```bash
npm run familyplate -- run listPantry --input '{"storageLocation":"pantry"}' --pretty
npm run familyplate -- run addGroceryItem --input '{"name":"bananas","quantity":6,"unit":"count","category":"Produce"}' --dry-run --pretty
npm run familyplate -- run updateGroceryItem --input '{"name":"bananas","quantity":8,"category":"Produce"}' --dry-run --pretty
npm run familyplate -- run checkGroceryItem --input '{"name":"Tomatoes"}' --dry-run --pretty
```

## Production Rollout

The hosted web app needs `NEXT_PUBLIC_CONVEX_SITE_URL` so the Settings page can
generate a connection command that points agents at the Convex HTTP API instead
of the Next.js web origin.

Public agent-auth discovery is served from the web origin:

```text
https://familyplate.co/auth.md
https://familyplate.co/.well-known/oauth-protected-resource
https://familyplate.co/.well-known/oauth-authorization-server
```

DNS-based agent discovery requires provider-side records outside this repo. See
`docs/dns-aid.md` for the exact DNS-AID records and DNSSEC validation steps.

Current production values:

```bash
NEXT_PUBLIC_CONVEX_SITE_URL=https://effervescent-gecko-133.convex.site
```

Render service:

```bash
srv-d6vp83n5r7bs73euj6m0
```

After the env var is set and the latest code is deployed, verify the public
agent surface:

```bash
npm run agent:smoke
```

Then create a temporary connection from Settings and run the live smoke:

```bash
FAMILYPLATE_AGENT_API_URL=https://effervescent-gecko-133.convex.site \
FAMILYPLATE_AGENT_TOKEN=fp_agent_... \
npm run agent:smoke
```

## Scopes

Connections are scoped. New connections start read-only:

- `read:profile`
- `read:pantry`
- `read:grocery`
- `read:plan`
- `read:recipes`

Settings can also grant write scopes during connection creation:

- `write:grocery`
- `write:pantry`
- `write:plan`
- `write:recipes`

The CLI still requires `--confirm` or `--dry-run` for writes.

Agent connections can expire after 1 hour, 24 hours, 7 days, or never. The
default in Settings is 24 hours.

## HTTP Contract

The CLI calls Convex HTTP routes directly:

```http
GET /api/agent/tools
POST /api/agent/run
Authorization: Bearer fp_agent_...
Content-Type: application/json
```

Request body:

```json
{
  "tool": "listPantry",
  "input": {
    "storageLocation": "pantry"
  },
  "dryRun": false
}
```

Successful response:

```json
{
  "ok": true,
  "tool": "listPantry",
  "dryRun": false,
  "result": []
}
```

## Safety Model

- Agent tokens are separate from household invite codes.
- Tokens are stored hashed in Convex.
- Tokens can be revoked from Settings.
- The token is only shown once.
- Tokens can be created with an expiration window.
- Settings shows connection scopes, active/revoked state, created time, and last
  used time.
- Each request checks the token, profile, household, and required scope.
- Writes are designed to support dry-run and explicit confirmation.
