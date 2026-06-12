import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FamilyPlate Agent Setup",
  description:
    "Connect trusted coding and terminal agents to FamilyPlate with scoped CLI access.",
};

const agentCommands = [
  "npx @familyplate/cli@latest instructions",
  "npx @familyplate/cli@latest connect --api-url https://effervescent-gecko-133.convex.site --token fp_agent_...",
  "npx @familyplate/cli@latest doctor --pretty",
];

const readCommands = [
  "familyplate pantry list --pretty",
  "familyplate grocery list --pretty",
  "familyplate plan list --pretty",
  "familyplate recipes list --pretty",
];

const writeCommands = [
  'familyplate grocery add "olive oil" --quantity 1 --unit bottle --category Pantry --dry-run --pretty',
  'familyplate grocery add "olive oil" --quantity 1 --unit bottle --category Pantry --confirm --pretty',
  'familyplate grocery check "Tomatoes" --dry-run --pretty',
  'familyplate grocery check "Tomatoes" --confirm --pretty',
];

const tools = [
  ["whoami", "Confirm the connected FamilyPlate profile and household."],
  ["listPantry", "Read pantry, fridge, and freezer items."],
  ["listGroceryList", "Read the household grocery list."],
  ["listMealPlan", "Read the active 7-night dinner plan."],
  ["listSavedRecipes", "Read saved cookbook recipes."],
  ["addGroceryItem", "Add one grocery item with write scope and confirmation."],
  ["checkGroceryItem", "Check off one grocery item with write scope and confirmation."],
];

export default function AgentsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
        <Link href="/" className="text-sm font-semibold text-primary">
          FamilyPlate
        </Link>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Agent Access
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Connect trusted agents to FamilyPlate
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
            FamilyPlate lets users connect Codex, Claude, Cursor, and terminal
            agents with scoped CLI access. Agents can read household food
            context and, when explicitly allowed, help manage grocery items
            without using the user&apos;s password or browser session.
          </p>
        </div>

        <section className="space-y-4 border-t border-border pt-6">
          <h2 className="text-2xl font-bold">Setup Flow</h2>
          <ol className="space-y-3 leading-7 text-muted-foreground">
            <li>1. The user signs in at FamilyPlate and opens Settings.</li>
            <li>2. The user creates an Agent Access connection.</li>
            <li>3. FamilyPlate shows a one-time token command.</li>
            <li>4. The agent runs the command locally and checks readiness.</li>
            <li>5. The user revokes the connection in Settings when finished.</li>
          </ol>
          <CommandBlock commands={agentCommands} />
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <h2 className="text-2xl font-bold">Safe Read Commands</h2>
          <p className="leading-7 text-muted-foreground">
            Read-only connections can inspect pantry, grocery, meal plan, and
            cookbook data for the connected household.
          </p>
          <CommandBlock commands={readCommands} />
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <h2 className="text-2xl font-bold">Confirmed Writes</h2>
          <p className="leading-7 text-muted-foreground">
            Grocery writes require the optional write scope and explicit
            confirmation. Agents should use dry runs first when the target item
            is ambiguous.
          </p>
          <CommandBlock commands={writeCommands} />
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <h2 className="text-2xl font-bold">Available Tools</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {tools.map(([name, description]) => (
              <div key={name} className="rounded-xl border border-border bg-card p-4">
                <p className="font-semibold">{name}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <h2 className="text-2xl font-bold">Agent-Readable Resources</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <ResourceLink
              href="/.well-known/familyplate-agent.json"
              title="Agent Manifest"
              description="Machine-readable setup, commands, scopes, and safety rules."
            />
            <ResourceLink
              href="/.well-known/agent-skills/familyplate-agent-cli.md"
              title="CLI Skill"
              description="Markdown instructions for agents learning how to connect."
            />
            <ResourceLink
              href="/.well-known/agent-skills/index.json"
              title="Skills Index"
              description="Discovery index for FamilyPlate agent skills."
            />
            <ResourceLink
              href="https://effervescent-gecko-133.convex.site/api/agent/tools"
              title="Tool Registry"
              description="Live JSON list of tools exposed by the agent API."
            />
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <h2 className="text-2xl font-bold">Safety Model</h2>
          <ul className="space-y-2 leading-7 text-muted-foreground">
            <li>Agent tokens are separate from household invite codes.</li>
            <li>Tokens are shown once, stored hashed, and revocable from Settings.</li>
            <li>Each request checks the token, household, profile, and required scope.</li>
            <li>Agents should not provide diagnosis, treatment, or medical nutrition advice.</li>
          </ul>
        </section>
      </section>
    </main>
  );
}

function CommandBlock({ commands }: { commands: string[] }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-card p-4 text-sm leading-7">
      <code>{commands.join("\n")}</code>
    </pre>
  );
}

function ResourceLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="rounded-xl border border-border bg-card p-4">
      <p className="font-semibold text-primary">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </Link>
  );
}
