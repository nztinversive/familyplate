#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
  FAMILYPLATE_AGENT_TOOLS,
  getAgentTool,
} from "@familyplate/agent-tools";

const CONFIG_PATH = join(homedir(), ".familyplate", "agent.json");

function usage() {
  console.log(`FamilyPlate agent CLI

Usage:
  familyplate connect --api-url <url> --token <token>
  familyplate doctor [--pretty]
  familyplate instructions [--json] [--pretty]
  familyplate status
  familyplate tools [--pretty]
  familyplate run <tool> [--input '{"key":"value"}'] [--dry-run] [--pretty]
  familyplate pantry list [--location pantry|fridge|freezer] [--pretty]
  familyplate grocery list [--pretty]
  familyplate grocery add <name> --quantity <n> --unit <unit> --category <category> --confirm [--pretty]
  familyplate grocery check <name> --confirm [--pretty]
  familyplate plan list [--pretty]
  familyplate recipes list [--pretty]

Environment overrides:
  FAMILYPLATE_AGENT_API_URL
  FAMILYPLATE_AGENT_TOKEN
`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      args._.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }
  return args;
}

async function loadConfig() {
  const apiUrl = process.env.FAMILYPLATE_AGENT_API_URL;
  const token = process.env.FAMILYPLATE_AGENT_TOKEN;
  if (apiUrl && token) {
    return { apiUrl, token, source: "env" };
  }

  try {
    const parsed = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
    return { ...parsed, source: CONFIG_PATH };
  } catch {
    throw new Error(
      "FamilyPlate is not connected. Run `familyplate connect --api-url <url> --token <token>` first."
    );
  }
}

async function saveConfig(config) {
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, {
    mode: 0o600,
  });
}

function normalizeApiUrl(value) {
  const trimmed = String(value ?? "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//.test(trimmed)) {
    throw new Error("API URL must start with http:// or https://.");
  }
  return trimmed;
}

function parseJsonInput(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(String(value));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Input must be a JSON object.");
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid --input JSON: ${error.message}`);
  }
}

function print(value, pretty) {
  console.log(JSON.stringify(value, null, pretty ? 2 : 0));
}

function checkPass(name, detail = "") {
  return { name, ok: true, detail };
}

function checkFail(name, detail = "") {
  return { name, ok: false, detail };
}

async function fetchTools(apiUrl) {
  const response = await fetch(`${normalizeApiUrl(apiUrl)}/api/agent/tools`);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? `tools endpoint failed with ${response.status}`);
  }
  return body;
}

async function runTool(toolName, input, options = {}) {
  const tool = getAgentTool(toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  const config = await loadConfig();
  const response = await fetch(`${normalizeApiUrl(config.apiUrl)}/api/agent/run`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${config.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      tool: toolName,
      input,
      dryRun: Boolean(options.dryRun),
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? `FamilyPlate API failed with ${response.status}`);
  }

  return body;
}

async function doctor(pretty) {
  const checks = [];
  let config = null;
  let connection = null;

  try {
    config = await loadConfig();
    checks.push(checkPass("configuration found", config.source));
  } catch (error) {
    checks.push(
      checkFail(
        "configuration found",
        `${error.message} Use Settings to create an agent connection, then run familyplate connect.`
      )
    );
    print({ ok: false, checks }, pretty);
    process.exitCode = 1;
    return;
  }

  try {
    const apiUrl = normalizeApiUrl(config.apiUrl);
    checks.push(checkPass("api url is valid", apiUrl));

    const toolsPayload = await fetchTools(apiUrl);
    const remoteNames = toolsPayload.tools.map((tool) => tool.name).sort();
    const localNames = FAMILYPLATE_AGENT_TOOLS.map((tool) => tool.name).sort();
    const toolsMatch = JSON.stringify(remoteNames) === JSON.stringify(localNames);
    checks.push(
      toolsMatch
        ? checkPass("tool registry matches server", remoteNames.join(", "))
        : checkFail(
            "tool registry matches server",
            `local=${localNames.join(", ")} remote=${remoteNames.join(", ")}`
          )
    );
  } catch (error) {
    checks.push(checkFail("api reachable", error.message));
  }

  try {
    const status = await runTool("whoami", {}, {});
    connection = status.result;
    checks.push(
      checkPass(
        "token is valid",
        `${connection.profile.email} in ${connection.household.name}`
      )
    );
    checks.push(checkPass("scopes", connection.scopes.join(", ")));
  } catch (error) {
    checks.push(checkFail("token is valid", error.message));
  }

  if (connection) {
    for (const [name, tool, input] of [
      ["pantry read", "listPantry", {}],
      ["grocery read", "listGroceryList", {}],
      ["meal plan read", "listMealPlan", {}],
      ["saved recipes read", "listSavedRecipes", {}],
    ]) {
      try {
        await runTool(tool, input, {});
        checks.push(checkPass(name));
      } catch (error) {
        checks.push(checkFail(name, error.message));
      }
    }

    if (connection.scopes.includes("write:grocery")) {
      try {
        await runTool("addGroceryItem", {
          name: "FamilyPlate doctor test",
          quantity: 1,
          unit: "item",
          category: "Other",
        }, { dryRun: true });
        checks.push(checkPass("grocery write dry-run", "write:grocery is enabled"));
      } catch (error) {
        checks.push(checkFail("grocery write dry-run", error.message));
      }
    } else {
      checks.push(
        checkPass(
          "grocery write scope",
          "not enabled; writes should be rejected for this connection"
        )
      );
    }
  }

  const ok = checks.every((check) => check.ok);
  print(
    {
      ok,
      config: config
        ? { source: config.source, apiUrl: normalizeApiUrl(config.apiUrl) }
        : null,
      checks,
      nextSteps: ok
        ? ["Agent connection is ready."]
        : [
            "Open FamilyPlate Settings.",
            "Create or revoke/recreate an agent connection.",
            "Run familyplate connect with the one-time command.",
          ],
    },
    pretty
  );
  if (!ok) process.exitCode = 1;
}

function getInstructionsPayload() {
  return {
    name: "FamilyPlate agent instructions",
    safetyRules: [
      "Use read commands freely to understand the user's pantry, grocery list, meal plan, and saved recipes.",
      "Never perform writes unless the user explicitly asks for that action.",
      "Run write tools with --dry-run first when the item or result is ambiguous.",
      "Use --confirm only after the user confirms the exact change.",
      "If a command fails because of missing scope, ask the user to create a connection with the needed scope.",
    ],
    setup: [
      "Ask the user to open FamilyPlate Settings and create an Agent Access connection.",
      "Run the one-time familyplate connect command.",
      "Run familyplate doctor --pretty before doing useful work.",
    ],
    commands: {
      health: ["familyplate doctor --pretty", "familyplate status --pretty"],
      reads: [
        "familyplate pantry list --pretty",
        "familyplate grocery list --pretty",
        "familyplate plan list --pretty",
        "familyplate recipes list --pretty",
      ],
      writes: [
        "familyplate grocery add \"olive oil\" --quantity 1 --unit bottle --category Pantry --dry-run --pretty",
        "familyplate grocery add \"olive oil\" --quantity 1 --unit bottle --category Pantry --confirm --pretty",
        "familyplate grocery check \"Tomatoes\" --dry-run --pretty",
        "familyplate grocery check \"Tomatoes\" --confirm --pretty",
      ],
    },
    tools: FAMILYPLATE_AGENT_TOOLS,
  };
}

function printInstructions(asJson, pretty) {
  const payload = getInstructionsPayload();
  if (asJson) {
    print(payload, pretty);
    return;
  }

  console.log(`# FamilyPlate Agent Instructions

## Setup
${payload.setup.map((item) => `- ${item}`).join("\n")}

## Safety Rules
${payload.safetyRules.map((item) => `- ${item}`).join("\n")}

## Health Checks
\`\`\`bash
${payload.commands.health.join("\n")}
\`\`\`

## Read Commands
\`\`\`bash
${payload.commands.reads.join("\n")}
\`\`\`

## Write Commands
\`\`\`bash
${payload.commands.writes.join("\n")}
\`\`\`

## Tool JSON Shapes
\`\`\`json
${JSON.stringify(payload.tools, null, 2)}
\`\`\`
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [command, subcommand, ...rest] = args._;

  if (!command || command === "help" || args.help) {
    usage();
    return;
  }

  if (command === "doctor") {
    await doctor(args.pretty ?? true);
    return;
  }

  if (command === "instructions") {
    printInstructions(args.json, args.pretty);
    return;
  }

  if (command === "connect") {
    if (!args["api-url"] || !args.token) {
      throw new Error("connect requires --api-url and --token.");
    }
    const config = {
      apiUrl: normalizeApiUrl(args["api-url"]),
      token: String(args.token).trim(),
      connectedAt: new Date().toISOString(),
    };
    await saveConfig(config);
    print({ ok: true, configPath: CONFIG_PATH, apiUrl: config.apiUrl }, args.pretty);
    return;
  }

  if (command === "status") {
    const config = await loadConfig();
    const result = await runTool("whoami", {}, {});
    print(
      {
        ok: true,
        source: config.source,
        apiUrl: config.apiUrl,
        connection: result.result,
      },
      args.pretty ?? true
    );
    return;
  }

  if (command === "tools") {
    print({ tools: FAMILYPLATE_AGENT_TOOLS }, args.pretty);
    return;
  }

  if (command === "run") {
    if (!subcommand) {
      throw new Error("run requires a tool name.");
    }
    const result = await runTool(subcommand, parseJsonInput(args.input), {
      dryRun: args["dry-run"],
    });
    print(result, args.pretty);
    return;
  }

  if (command === "pantry" && subcommand === "list") {
    const input = args.location ? { storageLocation: args.location } : {};
    print(await runTool("listPantry", input), args.pretty);
    return;
  }

  if (command === "grocery" && subcommand === "list") {
    print(await runTool("listGroceryList", {}), args.pretty);
    return;
  }

  if (command === "grocery" && subcommand === "add") {
    const name = rest.join(" ").trim();
    if (!name) throw new Error("grocery add requires an item name.");
    if (!args.quantity || !args.unit || !args.category) {
      throw new Error("grocery add requires --quantity, --unit, and --category.");
    }
    if (!args.confirm && !args["dry-run"]) {
      throw new Error("Writes require --confirm, or use --dry-run to preview.");
    }

    print(
      await runTool(
        "addGroceryItem",
        {
          name,
          quantity: Number(args.quantity),
          unit: String(args.unit),
          category: String(args.category),
        },
        { dryRun: args["dry-run"] }
      ),
      args.pretty
    );
    return;
  }

  if (command === "grocery" && subcommand === "check") {
    const name = rest.join(" ").trim();
    if (!name) throw new Error("grocery check requires an item name.");
    if (!args.confirm && !args["dry-run"]) {
      throw new Error("Writes require --confirm, or use --dry-run to preview.");
    }

    print(
      await runTool(
        "checkGroceryItem",
        { name },
        { dryRun: args["dry-run"] }
      ),
      args.pretty
    );
    return;
  }

  if (command === "plan" && subcommand === "list") {
    print(await runTool("listMealPlan", {}), args.pretty);
    return;
  }

  if (command === "recipes" && subcommand === "list") {
    print(await runTool("listSavedRecipes", {}), args.pretty);
    return;
  }

  throw new Error(`Unknown command: ${[command, subcommand].filter(Boolean).join(" ")}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
