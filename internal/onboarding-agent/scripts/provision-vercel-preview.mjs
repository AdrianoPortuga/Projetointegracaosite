#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function parseArgs(argv) {
  const parsed = {
    dryRun: false,
    provider: "auto",
    outputDir: path.resolve(process.cwd(), "internal", "onboarding-agent", "outputs", "vercel-provision")
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--client-slug") {
      parsed.clientSlug = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--project-name") {
      parsed.projectName = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--repo") {
      parsed.repo = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--provider") {
      parsed.provider = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--backend-base-url") {
      parsed.backendBaseUrl = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--operational-mode") {
      parsed.operationalMode = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--team-id") {
      parsed.teamId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (arg === "--output-dir") {
      parsed.outputDir = path.resolve(process.cwd(), argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
  }

  return parsed;
}

function printHelp() {
  console.log("Provisionamento Preview Vercel (Onboarding Agent)");
  console.log("");
  console.log("Uso:");
  console.log(
    "  node internal/onboarding-agent/scripts/provision-vercel-preview.mjs --client-slug <slug> [--project-name <name>] [--repo owner/name] [--provider auto|api|cli] [--dry-run]"
  );
  console.log("");
  console.log("Secrets esperados (ambiente):");
  console.log("  VERCEL_TOKEN (obrigatorio para execucao real)");
  console.log("  VERCEL_TEAM_ID (opcional)");
  console.log("  LEAD_API_TOKEN (obrigatorio para env de preview)");
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value, "utf8");
}

function getQuerySuffix(teamId) {
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
}

async function vercelApiRequest({ token, teamId, method, endpointPath, body }) {
  const suffix = getQuerySuffix(teamId);
  const url = `https://api.vercel.com${endpointPath}${endpointPath.includes("?") ? "&" : suffix ? "?" : ""}${suffix ? suffix.slice(1) : ""}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: response.ok, status: response.status, json, url };
}

function buildEnvPayloads({ clientSlug, operationalMode, backendBaseUrl, leadApiToken }) {
  return [
    { key: "SITE_CLIENT_SLUG", value: clientSlug },
    { key: "OPERATIONAL_MODE", value: operationalMode },
    { key: "BACKEND_BASE_URL", value: backendBaseUrl },
    { key: "LEAD_API_TOKEN", value: leadApiToken }
  ];
}

function requireConfig(clientSlug) {
  const configPath = path.resolve(process.cwd(), "config", "clients", `${clientSlug}.json`);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config do cliente nao encontrada: ${configPath}`);
  }
  return { configPath, config: readJson(configPath) };
}

async function runApiProvision(ctx) {
  const events = [];
  const { token, teamId, projectName, repo, envPayloads, dryRun } = ctx;

  if (dryRun) {
    events.push({ step: "lookup_project", action: "skipped_dry_run", projectName });
    events.push({
      step: "upsert_envs",
      action: "skipped_dry_run",
      env_keys: envPayloads.map((item) => item.key)
    });
    return { success: true, events, projectStatus: "dry-run" };
  }

  const lookup = await vercelApiRequest({
    token,
    teamId,
    method: "GET",
    endpointPath: `/v9/projects/${encodeURIComponent(projectName)}`
  });

  let projectCreated = false;
  if (lookup.ok) {
    events.push({ step: "lookup_project", status: "exists", projectName });
  } else if (lookup.status === 404) {
    const createBody = {
      name: projectName,
      framework: null
    };
    if (repo) {
      createBody.gitRepository = { type: "github", repo };
    }
    const created = await vercelApiRequest({
      token,
      teamId,
      method: "POST",
      endpointPath: "/v10/projects",
      body: createBody
    });
    if (!created.ok) {
      events.push({
        step: "create_project",
        status: "error",
        detail: created.json,
        http_status: created.status
      });
      return { success: false, events, projectStatus: "create_failed" };
    }
    projectCreated = true;
    events.push({ step: "create_project", status: "created", projectName });
  } else {
    events.push({
      step: "lookup_project",
      status: "error",
      detail: lookup.json,
      http_status: lookup.status
    });
    return { success: false, events, projectStatus: "lookup_failed" };
  }

  for (const envItem of envPayloads) {
    const upsert = await vercelApiRequest({
      token,
      teamId,
      method: "POST",
      endpointPath: `/v10/projects/${encodeURIComponent(projectName)}/env?upsert=true`,
      body: {
        key: envItem.key,
        value: envItem.value,
        target: ["preview"],
        type: "encrypted"
      }
    });

    if (!upsert.ok) {
      events.push({
        step: "upsert_env",
        status: "error",
        key: envItem.key,
        http_status: upsert.status,
        detail: upsert.json
      });
      return { success: false, events, projectStatus: projectCreated ? "created_partial_env" : "exists_partial_env" };
    }
    events.push({ step: "upsert_env", status: "ok", key: envItem.key, target: "preview" });
  }

  return { success: true, events, projectStatus: projectCreated ? "created" : "exists" };
}

function runCliCommand(args, env) {
  const result = spawnSync("vercel", args, {
    encoding: "utf8",
    env: { ...process.env, ...env }
  });
  return result;
}

function runCliProvision(ctx) {
  const events = [];
  const { teamId, projectName, envPayloads, dryRun, token } = ctx;

  if (dryRun) {
    events.push({ step: "cli", action: "skipped_dry_run", projectName, env_keys: envPayloads.map((item) => item.key) });
    return { success: true, events, projectStatus: "dry-run" };
  }

  const env = {};
  if (token) env.VERCEL_TOKEN = token;

  const listArgs = ["project", "ls"];
  if (teamId) listArgs.push("--scope", teamId);
  const list = runCliCommand(listArgs, env);
  if (list.status !== 0) {
    events.push({ step: "project_ls", status: "error", stderr: list.stderr });
    return { success: false, events, projectStatus: "lookup_failed" };
  }

  const exists = String(list.stdout || "").toLowerCase().includes(projectName.toLowerCase());
  if (!exists) {
    const addArgs = ["project", "add", projectName];
    if (teamId) addArgs.push("--scope", teamId);
    const created = runCliCommand(addArgs, env);
    if (created.status !== 0) {
      events.push({ step: "project_add", status: "error", stderr: created.stderr });
      return { success: false, events, projectStatus: "create_failed" };
    }
    events.push({ step: "project_add", status: "created", projectName });
  } else {
    events.push({ step: "project_ls", status: "exists", projectName });
  }

  for (const envItem of envPayloads) {
    const args = ["env", "add", envItem.key, "preview"];
    if (teamId) args.push("--scope", teamId);
    args.push("--yes");
    const add = spawnSync("vercel", args, {
      encoding: "utf8",
      env: { ...process.env, ...env },
      input: `${envItem.value}\n`
    });
    if (add.status !== 0) {
      events.push({ step: "env_add", status: "error", key: envItem.key, stderr: add.stderr });
      return { success: false, events, projectStatus: "env_failed" };
    }
    events.push({ step: "env_add", status: "ok", key: envItem.key, target: "preview" });
  }

  return { success: true, events, projectStatus: exists ? "exists" : "created" };
}

function renderReportMd(report) {
  return [
    "# Vercel Preview Provision Report",
    "",
    `- Run: ${report.run_id}`,
    `- Client slug: ${report.client_slug}`,
    `- Project: ${report.project_name}`,
    `- Provider: ${report.provider}`,
    `- Dry run: ${report.dry_run ? "sim" : "nao"}`,
    `- Status: ${report.status}`,
    `- Project status: ${report.project_status}`,
    "",
    "## Environment keys",
    ...report.environment_keys.map((key) => `- ${key}`),
    "",
    "## Eventos",
    ...report.events.map((event) => `- ${event.step}: ${event.status || event.action || "ok"}${event.key ? ` (${event.key})` : ""}`)
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.clientSlug) {
    throw new Error("Informe --client-slug");
  }
  if (!["auto", "api", "cli"].includes(args.provider)) {
    throw new Error("--provider deve ser auto, api ou cli");
  }

  const { configPath, config } = requireConfig(args.clientSlug);
  const projectName = args.projectName || config.vercel_project_name || `codestech-${args.clientSlug}-preview`;
  const backendBaseUrl =
    args.backendBaseUrl ||
    process.env.BACKEND_BASE_URL ||
    process.env.SDR_API_BASE_URL ||
    "https://leads-api.schoolia.online";
  const operationalMode = args.operationalMode || config.operational_mode || "demo";
  const leadApiToken = process.env.LEAD_API_TOKEN || "";
  const token = process.env.VERCEL_TOKEN || "";
  const teamId = args.teamId || process.env.VERCEL_TEAM_ID || "";
  const repo = args.repo || "AdrianoPortuga/Projetointegracaosite";
  const runId = `${nowStamp()}-${args.clientSlug}`;
  const runDir = path.resolve(args.outputDir, runId);
  ensureDir(runDir);

  const envPayloads = buildEnvPayloads({
    clientSlug: args.clientSlug,
    operationalMode,
    backendBaseUrl,
    leadApiToken: leadApiToken || "<MISSING_LEAD_API_TOKEN>"
  });

  const preflightWarnings = [];
  if (!args.dryRun && !token) {
    throw new Error("VERCEL_TOKEN ausente para execucao real");
  }
  if (!leadApiToken) {
    preflightWarnings.push("LEAD_API_TOKEN ausente no ambiente. Em execucao real isso impedira handoff real.");
  }

  let provisionResult;
  let providerUsed = args.provider;

  if (args.provider === "api") {
    provisionResult = await runApiProvision({ token, teamId, projectName, repo, envPayloads, dryRun: args.dryRun });
  } else if (args.provider === "cli") {
    provisionResult = runCliProvision({ token, teamId, projectName, envPayloads, dryRun: args.dryRun });
  } else {
    const apiResult = await runApiProvision({ token, teamId, projectName, repo, envPayloads, dryRun: args.dryRun });
    if (apiResult.success || args.dryRun) {
      provisionResult = apiResult;
      providerUsed = "api";
    } else {
      const cliResult = runCliProvision({ token, teamId, projectName, envPayloads, dryRun: args.dryRun });
      provisionResult = cliResult;
      providerUsed = "cli";
    }
  }

  const report = {
    run_id: runId,
    client_slug: args.clientSlug,
    config_path: configPath,
    project_name: projectName,
    repository: repo,
    provider: providerUsed,
    dry_run: args.dryRun,
    status: provisionResult.success ? "GO" : "NO_GO",
    project_status: provisionResult.projectStatus,
    environment_keys: envPayloads.map((item) => item.key),
    warnings: preflightWarnings,
    events: provisionResult.events
  };

  writeJson(path.join(runDir, "vercel-provision-report.json"), report);
  writeText(path.join(runDir, "vercel-provision-report.md"), `${renderReportMd(report)}\n`);

  console.log(`Run ID: ${runId}`);
  console.log(`Status: ${report.status}`);
  console.log(`Provider: ${providerUsed}`);
  console.log(`Outputs: ${runDir}`);

  if (!provisionResult.success) {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error("Erro no provisionamento Vercel:", error.message);
  process.exit(1);
});

