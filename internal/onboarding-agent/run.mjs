#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { runSupervisor } from "./supervisor.mjs";

function parseArgs(argv) {
  const parsed = {
    mode: "dry-run",
    approved: false,
    outputDir: path.resolve(process.cwd(), "internal", "onboarding-agent", "outputs"),
    allowOverwrite: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--input") {
      parsed.input = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--mode") {
      parsed.mode = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--output-dir") {
      parsed.outputDir = path.resolve(process.cwd(), argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === "--approved") {
      parsed.approved = true;
      continue;
    }

    if (arg === "--allow-overwrite") {
      parsed.allowOverwrite = true;
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
  console.log("Codestech Onboarding Agent MVP");
  console.log("");
  console.log("Uso:");
  console.log("  node internal/onboarding-agent/run.mjs --input <arquivo.json> [--mode dry-run|apply] [--approved]");
  console.log("");
  console.log("Opcoes:");
  console.log("  --input <arquivo>         Payload de onboarding");
  console.log("  --mode <dry-run|apply>    Modo de execucao (padrao: dry-run)");
  console.log("  --approved                Gate humano para permitir apply");
  console.log("  --allow-overwrite         Permite sobrescrever cliente existente em apply");
  console.log("  --output-dir <path>       Diretorio raiz de outputs");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.input) {
    console.error("Erro: informe --input <arquivo.json>");
    printHelp();
    process.exit(1);
  }

  if (!["dry-run", "apply"].includes(args.mode)) {
    console.error("Erro: --mode deve ser dry-run ou apply");
    process.exit(1);
  }

  const result = await runSupervisor({
    inputPath: path.resolve(process.cwd(), args.input),
    mode: args.mode,
    approved: args.approved,
    outputRootDir: args.outputDir,
    repoRoot: process.cwd(),
    allowOverwrite: args.allowOverwrite
  });

  console.log(`Run ID: ${result.runId}`);
  console.log(`Go/No-Go: ${result.goNoGo.go ? "GO" : "NO-GO"}`);
  console.log(`Outputs: ${result.outputDir}`);
  console.log(`Apply executado: ${result.apply.executed ? "sim" : "nao"}`);

  if (!result.goNoGo.go) {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error("Erro no onboarding agent:", error.message);
  process.exit(1);
});

