#!/usr/bin/env node
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
  npx @familyplate/cli@latest <command>
  familyplate connect --api-url <url> --token <token>
  familyplate config [--pretty]
  familyplate disconnect [--pretty]
  familyplate doctor [--pretty]
  familyplate instructions [--json] [--pretty]
  familyplate status
  familyplate tools [--pretty]
  familyplate run <tool> [--input '{"key":"value"}'] [--dry-run] [--pretty]
  familyplate pantry list [--location pantry|fridge|freezer] [--pretty]
  familyplate pantry add <name> --quantity <n> --unit <unit> --category <category> --location pantry|fridge|freezer --confirm [--pretty]
  familyplate pantry update --item-id <id> [--name <name>] [--quantity <n>] [--unit <unit>] [--category <category>] [--location pantry|fridge|freezer] --confirm [--pretty]
  familyplate pantry remove --item-id <id> --confirm [--pretty]
  familyplate grocery list [--pretty]
  familyplate grocery add <name> --quantity <n> --unit <unit> --category <category> --confirm [--pretty]
  familyplate grocery update <name> [--quantity <n>] [--unit <unit>] [--category <category>] [--checked true|false] --confirm [--pretty]
  familyplate grocery check <name> --confirm [--pretty]
  familyplate plan list [--pretty]
  familyplate plan add --recipe-id <id> --date YYYY-MM-DD --confirm [--pretty]
  familyplate plan remove --meal-id <id> --confirm [--pretty]
  familyplate recipes list [--pretty]
  familyplate recipes create --input '{"title":"..."}' --confirm [--pretty]

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

async function loadDiskConfig() {
  try {
    const parsed = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
    return { ...parsed, source: CONFIG_PATH };
  } catch {
    return null;
  }
}

async function loadConfig() {
  const apiUrl = process.env.FAMILYPLATE_AGENT_API_URL;
  const token = process.env.FAMILYPLATE_AGENT_TOKEN;
  if (apiUrl && token) {
    return { apiUrl, token, source: "env" };
  }

  const diskConfig = await loadDiskConfig();
  if (diskConfig) return diskConfig;

  throw new Error(
    "FamilyPlate is not connected. Run `familyplate connect --api-url <url> --token <token>` first."
  );
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

function requireWriteConfirmation(args) {
  if (!args.confirm && !args["dry-run"]) {
    throw new Error("Writes require --confirm, or use --dry-run to preview.");
  }
}

function parseBoolean(value, field) {
  if (value === true) return true;
  if (value === false) return false;
  if (String(value).toLowerCase() === "true") return true;
  if (String(value).toLowerCase() === "false") return false;
  throw new Error(`${field} must be true or false.`);
}

function parseExpirationDate(value) {
  if (!value) return undefined;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("--expiration-date must be YYYY-MM-DD or a timestamp in milliseconds.");
  }
  return parsed.getTime();
}

function print(value, pretty) {
  console.log(JSON.stringify(value, null, pretty ? 2 : 0));
}

function describeConfig(config) {
  return {
    source: config.source,
    apiUrl: config.apiUrl,
    connectedAt: config.connectedAt ?? null,
    token: config.token ? "[redacted]" : null,
  };
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

    if (connection.scopes.includes("write:pantry")) {
      try {
        await runTool("addPantryItem", {
          name: "FamilyPlate doctor test",
          quantity: 1,
          unit: "item",
          category: "Other",
          storageLocation: "pantry",
        }, { dryRun: true });
        checks.push(checkPass("pantry write dry-run", "write:pantry is enabled"));
      } catch (error) {
        checks.push(checkFail("pantry write dry-run", error.message));
      }
    } else {
      checks.push(
        checkPass(
          "pantry write scope",
          "not enabled; writes should be rejected for this connection"
        )
      );
    }

    if (connection.scopes.includes("write:recipes")) {
      try {
        await runTool("createSavedRecipe", {
          title: "FamilyPlate doctor recipe",
          description: "Dry-run recipe used to verify agent access.",
          ingredients: [{ name: "Test ingredient", quantity: 1, unit: "item" }],
          instructions: ["Dry run only."],
          effortLevel: "easy",
          estimatedTime: 5,
          servings: 1,
          tags: ["doctor"],
        }, { dryRun: true });
        checks.push(checkPass("recipe write dry-run", "write:recipes is enabled"));
      } catch (error) {
        checks.push(checkFail("recipe write dry-run", error.message));
      }
    } else {
      checks.push(
        checkPass(
          "recipe write scope",
          "not enabled; writes should be rejected for this connection"
        )
      );
    }

    if (connection.scopes.includes("write:plan")) {
      checks.push(
        checkPass(
          "meal plan write scope",
          "enabled; use familyplate plan add/remove with a real recipe or meal id"
        )
      );
    } else {
      checks.push(
        checkPass(
          "meal plan write scope",
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
      "If the published CLI is available, use npx @familyplate/cli@latest <command>.",
      "Run the one-time familyplate connect command.",
      "Run familyplate doctor --pretty before doing useful work.",
    ],
    commands: {
      install: [
        "npx @familyplate/cli@latest instructions",
        "npm install -g @familyplate/cli",
      ],
      health: [
        "familyplate config --pretty",
        "familyplate doctor --pretty",
        "familyplate status --pretty",
      ],
      reads: [
        "familyplate pantry list --pretty",
        "familyplate grocery list --pretty",
        "familyplate plan list --pretty",
        "familyplate recipes list --pretty",
      ],
      writes: [
        "familyplate grocery add \"olive oil\" --quantity 1 --unit bottle --category Pantry --dry-run --pretty",
        "familyplate grocery add \"olive oil\" --quantity 1 --unit bottle --category Pantry --confirm --pretty",
        "familyplate grocery update \"olive oil\" --quantity 2 --category Condiments --dry-run --pretty",
        "familyplate grocery update \"olive oil\" --quantity 2 --category Condiments --confirm --pretty",
        "familyplate grocery check \"Tomatoes\" --dry-run --pretty",
        "familyplate grocery check \"Tomatoes\" --confirm --pretty",
        "familyplate pantry add \"Chicken thighs\" --quantity 2 --unit lb --category Meat --location fridge --dry-run --pretty",
        "familyplate pantry update --item-id <pantry_item_id> --quantity 1 --dry-run --pretty",
        "familyplate pantry remove --item-id <pantry_item_id> --dry-run --pretty",
        "familyplate plan add --recipe-id <recipe_id> --date 2026-06-15 --dry-run --pretty",
        "familyplate plan remove --meal-id <planned_meal_id> --dry-run --pretty",
        "familyplate recipes create --input '{\"title\":\"Black Bean Tacos\",\"ingredients\":[{\"name\":\"Black beans\",\"quantity\":1,\"unit\":\"can\"}],\"instructions\":[\"Warm beans and tortillas.\"],\"effortLevel\":\"easy\",\"estimatedTime\":15,\"servings\":4}' --dry-run --pretty",
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

## Install
\`\`\`bash
${payload.commands.install.join("\n")}
\`\`\`

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

  if (command === "config") {
    const envConfig =
      process.env.FAMILYPLATE_AGENT_API_URL && process.env.FAMILYPLATE_AGENT_TOKEN
        ? {
            apiUrl: process.env.FAMILYPLATE_AGENT_API_URL,
            token: process.env.FAMILYPLATE_AGENT_TOKEN,
            connectedAt: null,
            source: "env",
          }
        : null;
    const diskConfig = await loadDiskConfig();
    print(
      {
        ok: Boolean(envConfig || diskConfig),
        active: envConfig
          ? describeConfig(envConfig)
          : diskConfig
            ? describeConfig(diskConfig)
            : null,
        disk: diskConfig ? describeConfig(diskConfig) : null,
        env: {
          apiUrl: process.env.FAMILYPLATE_AGENT_API_URL ? "[set]" : "[missing]",
          token: process.env.FAMILYPLATE_AGENT_TOKEN ? "[set]" : "[missing]",
        },
        configPath: CONFIG_PATH,
      },
      args.pretty ?? true
    );
    if (!envConfig && !diskConfig) process.exitCode = 1;
    return;
  }

  if (command === "disconnect") {
    const diskConfig = await loadDiskConfig();
    await rm(CONFIG_PATH, { force: true });
    print(
      {
        ok: true,
        removedConfig: Boolean(diskConfig),
        configPath: CONFIG_PATH,
        envStillActive: Boolean(
          process.env.FAMILYPLATE_AGENT_API_URL && process.env.FAMILYPLATE_AGENT_TOKEN
        ),
        note:
          "This only removes local CLI config. Revoke the token from FamilyPlate Settings to remove server access.",
      },
      args.pretty ?? true
    );
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

  if (command === "pantry" && subcommand === "add") {
    const name = rest.join(" ").trim();
    if (!name) throw new Error("pantry add requires an item name.");
    if (!args.quantity || !args.unit || !args.category || !args.location) {
      throw new Error("pantry add requires --quantity, --unit, --category, and --location.");
    }
    requireWriteConfirmation(args);

    const input = {
      name,
      quantity: Number(args.quantity),
      unit: String(args.unit),
      category: String(args.category),
      storageLocation: String(args.location),
      ...(args["expiration-date"]
        ? { expirationDate: parseExpirationDate(args["expiration-date"]) }
        : {}),
    };
    print(await runTool("addPantryItem", input, { dryRun: args["dry-run"] }), args.pretty);
    return;
  }

  if (command === "pantry" && subcommand === "update") {
    if (!args["item-id"]) throw new Error("pantry update requires --item-id.");
    requireWriteConfirmation(args);

    const input = {
      itemId: String(args["item-id"]),
      ...(args.name ? { name: String(args.name) } : {}),
      ...(args.quantity ? { quantity: Number(args.quantity) } : {}),
      ...(args.unit ? { unit: String(args.unit) } : {}),
      ...(args.category ? { category: String(args.category) } : {}),
      ...(args.location ? { storageLocation: String(args.location) } : {}),
      ...(args["expiration-date"]
        ? { expirationDate: parseExpirationDate(args["expiration-date"]) }
        : {}),
      ...(args["clear-expiration"] ? { clearExpirationDate: true } : {}),
    };
    print(await runTool("updatePantryItem", input, { dryRun: args["dry-run"] }), args.pretty);
    return;
  }

  if (command === "pantry" && subcommand === "remove") {
    if (!args["item-id"]) throw new Error("pantry remove requires --item-id.");
    requireWriteConfirmation(args);
    print(
      await runTool(
        "removePantryItem",
        { itemId: String(args["item-id"]) },
        { dryRun: args["dry-run"] }
      ),
      args.pretty
    );
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
    requireWriteConfirmation(args);

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

  if (command === "grocery" && subcommand === "update") {
    const name = rest.join(" ").trim();
    if (!name) throw new Error("grocery update requires an item name.");
    requireWriteConfirmation(args);

    const input = {
      name,
      ...(args.quantity ? { quantity: Number(args.quantity) } : {}),
      ...(args.unit ? { unit: String(args.unit) } : {}),
      ...(args.category ? { category: String(args.category) } : {}),
      ...(args.checked !== undefined
        ? { checked: parseBoolean(args.checked, "--checked") }
        : {}),
    };
    print(await runTool("updateGroceryItem", input, { dryRun: args["dry-run"] }), args.pretty);
    return;
  }

  if (command === "grocery" && subcommand === "check") {
    const name = rest.join(" ").trim();
    if (!name) throw new Error("grocery check requires an item name.");
    requireWriteConfirmation(args);

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

  if (command === "plan" && subcommand === "add") {
    if (!args["recipe-id"] || !args.date) {
      throw new Error("plan add requires --recipe-id and --date.");
    }
    requireWriteConfirmation(args);
    print(
      await runTool(
        "addMealToPlan",
        { recipeId: String(args["recipe-id"]), date: String(args.date) },
        { dryRun: args["dry-run"] }
      ),
      args.pretty
    );
    return;
  }

  if (command === "plan" && subcommand === "remove") {
    if (!args["meal-id"]) throw new Error("plan remove requires --meal-id.");
    requireWriteConfirmation(args);
    print(
      await runTool(
        "removeMealFromPlan",
        { mealId: String(args["meal-id"]) },
        { dryRun: args["dry-run"] }
      ),
      args.pretty
    );
    return;
  }

  if (command === "recipes" && subcommand === "list") {
    print(await runTool("listSavedRecipes", {}), args.pretty);
    return;
  }

  if (command === "recipes" && subcommand === "create") {
    if (!args.input) throw new Error("recipes create requires --input JSON.");
    requireWriteConfirmation(args);
    print(
      await runTool(
        "createSavedRecipe",
        parseJsonInput(args.input),
        { dryRun: args["dry-run"] }
      ),
      args.pretty
    );
    return;
  }

  throw new Error(`Unknown command: ${[command, subcommand].filter(Boolean).join(" ")}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
