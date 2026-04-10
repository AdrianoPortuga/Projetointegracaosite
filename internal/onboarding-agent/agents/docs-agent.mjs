export function runDocsAgent({ runId, mode, request, qa, apply, outputRelativeDir }) {
  const go = qa.blockers.length === 0;

  const summary = {
    run_id: runId,
    mode,
    client_slug: request.client_slug,
    segment: request.segment,
    operational_mode: request.operational_mode,
    go_no_go: go ? "go" : "no-go",
    blockers: qa.blockers,
    warnings: qa.warnings,
    apply
  };

  const manualActions = [
    "Revisar IDs reais de ClickUp e Telegram antes de production.",
    "Validar payload no frontend (/api/sdr/chat e /api/lead/codesagency) apos deploy.",
    "Nao executar deploy/DNS sem aprovacao humana registrada."
  ];

  if (!apply.executed) {
    manualActions.unshift("Executar apply com gate humano: --mode apply --approved.");
  }

  if (request.operational_mode === "production") {
    manualActions.push("Executar checklist adicional de producao (tokens, monitoramento, rollback).");
  }

  const md = [
    "# Onboarding Report",
    "",
    `- Run ID: ${runId}`,
    `- Mode: ${mode}`,
    `- Client: ${request.client_slug}`,
    `- Segment: ${request.segment}`,
    `- Operational mode: ${request.operational_mode}`,
    `- Resultado: ${go ? "GO" : "NO-GO"}`,
    "",
    "## Blockers",
    qa.blockers.length ? qa.blockers.map((item) => `- ${item.message}`).join("\n") : "- Nenhum",
    "",
    "## Warnings",
    qa.warnings.length ? qa.warnings.map((item) => `- ${item.message}`).join("\n") : "- Nenhum",
    "",
    "## Apply",
    `- Executado: ${apply.executed ? "sim" : "nao"}`,
    `- Motivo: ${apply.reason}`,
    "",
    "## Outputs",
    `- Pasta: ${outputRelativeDir}`
  ].join("\n");

  const manualMd = [
    "# Manual Actions",
    "",
    ...manualActions.map((item) => `- ${item}`)
  ].join("\n");

  return {
    reportJson: summary,
    reportMd: `${md}\n`,
    manualActionsMd: `${manualMd}\n`,
    goNoGo: {
      go,
      blockers: qa.blockers.map((item) => item.message),
      warnings: qa.warnings.map((item) => item.message)
    }
  };
}

