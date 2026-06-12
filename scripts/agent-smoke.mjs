#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FAMILYPLATE_AGENT_TOOLS } from "@familyplate/agent-tools";

const apiUrl =
  process.env.FAMILYPLATE_AGENT_API_URL ??
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
  "https://effervescent-gecko-133.convex.site";
const token = process.env.FAMILYPLATE_AGENT_TOKEN;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run(command, args, options = {}) {
  return await new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: new URL("..", import.meta.url),
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function postRun(body, bearerToken) {
  const response = await fetch(`${apiUrl}/api/agent/run`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(bearerToken ? { authorization: `Bearer ${bearerToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

const checks = [];
function pass(name, detail = "") {
  checks.push({ name, ok: true, detail });
}

const toolsResponse = await fetch(`${apiUrl}/api/agent/tools`);
assert(toolsResponse.ok, `tools endpoint returned ${toolsResponse.status}`);
const toolsPayload = await toolsResponse.json();
const remoteNames = toolsPayload.tools.map((tool) => tool.name).sort();
const localNames = FAMILYPLATE_AGENT_TOOLS.map((tool) => tool.name).sort();
assert(
  JSON.stringify(remoteNames) === JSON.stringify(localNames),
  `remote tools ${remoteNames.join(",")} did not match local tools ${localNames.join(",")}`
);
pass("tools endpoint matches local registry", remoteNames.join(", "));

const missingToken = await postRun({ tool: "whoami", input: {} });
assert(missingToken.response.status === 401, "missing token should return 401");
assert(missingToken.payload?.error === "Missing bearer token.", "missing token error changed");
pass("missing token returns clean 401");

const fakeToken = await postRun({ tool: "whoami", input: {} }, "fp_agent_fake");
assert(fakeToken.response.status === 401, "fake token should return 401");
assert(
  fakeToken.payload?.error === "Agent connection is invalid or revoked.",
  "fake token error changed"
);
pass("fake token returns clean 401");

const cliTools = await run("node", ["apps/cli/bin/familyplate.mjs", "tools", "--pretty"]);
assert(cliTools.code === 0, `CLI tools failed: ${cliTools.stderr}`);
const cliToolsPayload = JSON.parse(cliTools.stdout);
assert(
  cliToolsPayload.tools.some((tool) => tool.name === "checkGroceryItem"),
  "CLI tools output is missing checkGroceryItem"
);
pass("CLI lists shared tools");

const cliInstructions = await run("node", [
  "apps/cli/bin/familyplate.mjs",
  "instructions",
  "--json",
  "--pretty",
]);
assert(cliInstructions.code === 0, `CLI instructions failed: ${cliInstructions.stderr}`);
const instructionsPayload = JSON.parse(cliInstructions.stdout);
assert(
  instructionsPayload.tools.some((tool) => tool.name === "listPantry"),
  "CLI instructions output is missing tool JSON shapes"
);
assert(
  instructionsPayload.safetyRules.some((rule) => rule.includes("--dry-run")),
  "CLI instructions output is missing dry-run safety guidance"
);
pass("CLI prints agent instructions");

const tempConfigHome = await mkdtemp(join(tmpdir(), "familyplate-agent-config-"));
try {
  const configEnv = { HOME: tempConfigHome };
  const connect = await run(
    "node",
    [
      "apps/cli/bin/familyplate.mjs",
      "connect",
      "--api-url",
      apiUrl,
      "--token",
      "fp_agent_config_smoke",
      "--pretty",
    ],
    { env: configEnv }
  );
  assert(connect.code === 0, `CLI connect failed: ${connect.stderr}`);

  const config = await run(
    "node",
    ["apps/cli/bin/familyplate.mjs", "config", "--pretty"],
    { env: configEnv }
  );
  assert(config.code === 0, `CLI config failed: ${config.stderr}`);
  const configPayload = JSON.parse(config.stdout);
  assert(configPayload.active.token === "[redacted]", "CLI config should redact token");
  assert(!config.stdout.includes("fp_agent_config_smoke"), "CLI config leaked token");

  const disconnect = await run(
    "node",
    ["apps/cli/bin/familyplate.mjs", "disconnect", "--pretty"],
    { env: configEnv }
  );
  assert(disconnect.code === 0, `CLI disconnect failed: ${disconnect.stderr}`);
  const disconnectPayload = JSON.parse(disconnect.stdout);
  assert(disconnectPayload.removedConfig === true, "CLI disconnect should remove config");
  pass("CLI config and disconnect work");
} finally {
  await rm(tempConfigHome, { recursive: true, force: true });
}

const noConfirm = await run("node", [
  "apps/cli/bin/familyplate.mjs",
  "grocery",
  "check",
  "Tomatoes",
]);
assert(noConfirm.code === 1, "grocery check without --confirm should fail");
assert(
  noConfirm.stderr.includes("Writes require --confirm"),
  "no-confirm error should mention --confirm"
);
pass("CLI blocks grocery check without --confirm");

if (token) {
  const tempHome = await mkdtemp(join(tmpdir(), "familyplate-agent-smoke-"));
  try {
    const env = {
      HOME: tempHome,
      FAMILYPLATE_AGENT_API_URL: apiUrl,
      FAMILYPLATE_AGENT_TOKEN: token,
    };
    for (const args of [
      ["status", "--pretty"],
      ["pantry", "list", "--pretty"],
      ["grocery", "list", "--pretty"],
      ["plan", "list", "--pretty"],
      ["recipes", "list", "--pretty"],
    ]) {
      const result = await run("node", ["apps/cli/bin/familyplate.mjs", ...args], {
        env,
      });
      assert(result.code === 0, `live CLI ${args.join(" ")} failed: ${result.stderr}`);
      JSON.parse(result.stdout);
    }
    pass("live token read commands pass");

    const doctor = await run(
      "node",
      ["apps/cli/bin/familyplate.mjs", "doctor", "--pretty"],
      { env }
    );
    assert(doctor.code === 0, `live CLI doctor failed: ${doctor.stderr}`);
    const doctorPayload = JSON.parse(doctor.stdout);
    assert(doctorPayload.ok === true, "doctor should pass with a live token");
    assert(
      doctorPayload.checks.some((check) => check.name === "token is valid" && check.ok),
      "doctor output should validate token"
    );
    pass("live token doctor passes");

    const dryRun = await run(
      "node",
      [
        "apps/cli/bin/familyplate.mjs",
        "grocery",
        "check",
        "Tomatoes",
        "--dry-run",
        "--pretty",
      ],
      { env }
    );
    if (dryRun.code === 0) {
      JSON.parse(dryRun.stdout);
      pass("live token grocery check dry-run passes");
    } else {
      assert(
        dryRun.stderr.includes("missing scope: write:grocery") ||
          dryRun.stderr.includes("No grocery item found"),
        `unexpected dry-run failure: ${dryRun.stderr}`
      );
      pass("live token grocery check dry-run is safely rejected", dryRun.stderr.trim());
    }
  } finally {
    await rm(tempHome, { recursive: true, force: true });
  }
} else {
  pass("live token checks skipped", "set FAMILYPLATE_AGENT_TOKEN to enable");
}

console.log(JSON.stringify({ ok: true, apiUrl, checks }, null, 2));
