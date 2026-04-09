import path from "node:path";
import { runConfigAgent } from "./agents/config-agent.mjs";
import { runKnowledgeAgent } from "./agents/knowledge-agent.mjs";
import { runQaAgent } from "./agents/qa-agent.mjs";
import { runDocsAgent } from "./agents/docs-agent.mjs";
import { makeRunId, readJson, writeJson, writeText } from "./lib/io.mjs";
import { validateOnboardingRequest } from "./lib/validator.mjs";

function toRelative(repoRoot, absolutePath) {
  return path.relative(repoRoot, absolutePath) || ".";
}

function persistPreviewArtifacts({ artifacts, previewRoot }) {
  for (const artifact of artifacts) {
    const targetPath = path.resolve(previewRoot, artifact.relativePath);
    if (artifact.type === "text") {
      writeText(targetPath, artifact.content);
      continue;
    }
    writeJson(targetPath, artifact.content);
  }
}

function persistApplyArtifacts({ artifacts, repoRoot }) {
  for (const artifact of artifacts) {
    const targetPath = path.resolve(repoRoot, artifact.relativePath);
    if (artifact.type === "text") {
      writeText(targetPath, artifact.content);
      continue;
    }
    writeJson(targetPath, artifact.content);
  }
}

export async function runSupervisor({ inputPath, mode, approved, outputRootDir, repoRoot, allowOverwrite }) {
  const request = readJson(inputPath);
  const schemaValidation = validateOnboardingRequest(request);
  const runId = makeRunId(request.client_slug || "unknown-client");
  const outputDir = path.resolve(outputRootDir, runId);
  const previewDir = path.resolve(outputDir, "preview");

  const artifacts = [];

  if (!schemaValidation.valid) {
    const goNoGo = { go: false, blockers: schemaValidation.errors, warnings: [] };
    writeJson(path.resolve(outputDir, "go-no-go.json"), goNoGo);
    writeJson(path.resolve(outputDir, "onboarding-report.json"), {
      run_id: runId,
      mode,
      input_path: inputPath,
      schema_errors: schemaValidation.errors
    });
    writeText(
      path.resolve(outputDir, "onboarding-report.md"),
      `# Onboarding Report\n\n- Run ID: ${runId}\n- Resultado: NO-GO\n\n## Erros de schema\n${schemaValidation.errors
        .map((item) => `- ${item}`)
        .join("\n")}\n`
    );
    writeText(
      path.resolve(outputDir, "manual-actions.md"),
      "# Manual Actions\n\n- Corrigir schema do payload de onboarding e executar novamente.\n"
    );

    return {
      runId,
      outputDir,
      goNoGo,
      apply: { executed: false, reason: "schema invalido" }
    };
  }

  const configOutput = runConfigAgent({ request, repoRoot });
  const knowledgeOutput = runKnowledgeAgent({ request });

  artifacts.push(...configOutput.artifacts, ...knowledgeOutput.artifacts);

  persistPreviewArtifacts({ artifacts, previewRoot: previewDir });

  const configArtifact = configOutput.artifacts[0];
  const qa = runQaAgent({
    request,
    configArtifact,
    mode,
    approved,
    repoRoot,
    allowOverwrite
  });

  const canApply = mode === "apply" && approved && qa.blockers.length === 0;
  const apply = {
    requested: mode === "apply",
    executed: false,
    reason: "Modo dry-run. Sem alteracoes reais."
  };

  if (mode === "apply" && !approved) {
    apply.reason = "Apply bloqueado: gate humano (--approved) ausente.";
  } else if (mode === "apply" && qa.blockers.length > 0) {
    apply.reason = "Apply bloqueado por blockers no QA.";
  } else if (canApply) {
    persistApplyArtifacts({ artifacts, repoRoot });
    apply.executed = true;
    apply.reason = "Apply executado com sucesso.";
  }

  const docs = runDocsAgent({
    runId,
    mode,
    request,
    qa,
    apply,
    outputRelativeDir: toRelative(repoRoot, outputDir)
  });

  writeJson(path.resolve(outputDir, "onboarding-report.json"), {
    ...docs.reportJson,
    input_path: toRelative(repoRoot, inputPath),
    schema_valid: true,
    generated_artifacts: artifacts.map((item) => item.relativePath),
    segment_base_found: configOutput.meta.segmentBaseFound
  });
  writeText(path.resolve(outputDir, "onboarding-report.md"), docs.reportMd);
  writeText(path.resolve(outputDir, "manual-actions.md"), docs.manualActionsMd);
  writeJson(path.resolve(outputDir, "go-no-go.json"), docs.goNoGo);

  return {
    runId,
    outputDir,
    goNoGo: docs.goNoGo,
    apply
  };
}

