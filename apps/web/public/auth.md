# FamilyPlate auth.md

FamilyPlate lets trusted agents connect to a user's household through scoped
agent tokens. Agents must not ask for a FamilyPlate password, browser session,
household invite code, Convex admin access, or payment credentials.

## Audience

This registration guide is for coding agents, terminal agents, and personal AI
assistants that a FamilyPlate user explicitly authorizes to read or update their
pantry, grocery list, dinner plan, or saved recipes.

## Discovery

- OAuth Protected Resource Metadata: `https://familyplate.co/.well-known/oauth-protected-resource`
- OAuth Authorization Server Metadata: `https://familyplate.co/.well-known/oauth-authorization-server`
- Agent setup page: `https://familyplate.co/agents`
- Agent manifest: `https://familyplate.co/.well-known/familyplate-agent.json`
- Agent skills index: `https://familyplate.co/.well-known/agent-skills/index.json`
- MCP server card: `https://familyplate.co/.well-known/mcp/server-card.json`

## Supported registration method

FamilyPlate currently supports a user-mediated scoped token flow. In Auth.md
metadata this is also advertised as an anonymous/user-claimed flow because the
agent does not present an external identity assertion; the signed-in FamilyPlate
user claims and provisions the connection from Settings.

1. Send the user to `https://familyplate.co` to sign in.
2. Ask the user to open Settings and create an Agent Access connection.
3. Ask the user to grant only the scopes needed for the task.
4. Ask the user to choose an expiration: 1 hour, 24 hours, 7 days, or no expiration.
5. Ask the user to run the one-time `familyplate connect` command in the local terminal where the agent operates.
6. Run `familyplate doctor --pretty` before doing useful work.

The token is displayed once and is used as a Bearer token against the FamilyPlate
agent API. Prefer the generated local terminal command instead of asking the user
to paste the token into chat.

## Credential type

- `scoped_agent_bearer_token`

Agents send credentials in the HTTP `Authorization` header:

```http
Authorization: Bearer fp_agent_...
```

## API endpoints

- Tool registry: `GET https://effervescent-gecko-133.convex.site/api/agent/tools`
- Tool runner: `POST https://effervescent-gecko-133.convex.site/api/agent/run`

Example request:

```http
POST /api/agent/run HTTP/1.1
Host: effervescent-gecko-133.convex.site
Authorization: Bearer fp_agent_...
Content-Type: application/json

{"tool":"listPantry","input":{"storageLocation":"pantry"},"dryRun":false}
```

## Scopes

Read-only connections include:

- `read:profile`
- `read:pantry`
- `read:grocery`
- `read:plan`
- `read:recipes`

Optional write scopes:

- `write:grocery`
- `write:pantry`
- `write:plan`
- `write:recipes`

Writes require explicit user intent. CLI write commands should use `--dry-run`
first when the target is ambiguous and `--confirm` only after the user confirms
the exact change.

## Claim and revocation

- Claim URI: `https://familyplate.co/settings`
- Revocation URI: `https://familyplate.co/settings`

The user owns credential creation and revocation from FamilyPlate Settings.
Agents should remind the user to revoke the connection when the task is done.

## Install

```bash
npx @familyplate/cli@latest instructions
npx @familyplate/cli@latest connect --api-url https://effervescent-gecko-133.convex.site --token fp_agent_...
npx @familyplate/cli@latest doctor --pretty
```

Or, inside this repository:

```bash
npm exec --workspace=@familyplate/cli familyplate -- instructions
npm exec --workspace=@familyplate/cli familyplate -- doctor --pretty
```

## Safety rules

- Do not ask for the user's FamilyPlate password.
- Do not automate browser sign-in unless the user explicitly requests a browser walkthrough.
- Do not perform writes unless the user explicitly asks for that action.
- Do not provide diagnosis, treatment, or medical nutrition advice.
- Do not store the token outside the local CLI config or an approved local environment variable.
