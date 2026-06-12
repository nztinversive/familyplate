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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [command, subcommand, ...rest] = args._;

  if (!command || command === "help" || args.help) {
    usage();
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
