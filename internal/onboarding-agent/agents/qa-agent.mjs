import path from "node:path";
import { pathExists, safeSlug } from "../lib/io.mjs";

function ensure(condition, message, level = "blocker") {
  return condition ? null : { level, message };
}

export function runQaAgent({ request, configArtifact, mode, approved, repoRoot, allowOverwrite }) {
  const issues = [];
  const clientSlug = safeSlug(request.client_slug);
  const segment = safeSlug(request.segment);
  const config = configArtifact.content;

  const checks = [
    ensure(Boolean(clientSlug), "client_slug ausente"),
    ensure(Boolean(segment), "segment ausente"),
    ensure(["demo", "production"].includes(request.operational_mode), "operational_mode invalido"),
    ensure(typeof request.channels.site_sdr_enabled === "boolean", "channels.site_sdr_enabled invalido"),
    ensure(typeof request.channels.form_enabled === "boolean", "channels.form_enabled invalido"),
    ensure(typeof request.channels.whatsapp_enabled === "boolean", "channels.whatsapp_enabled invalido"),
    ensure(Boolean(config.sdr?.origin_label), "sdr.origin_label nao foi gerado"),
    ensure(Boolean(config.lead_routing?.route_module), "lead_routing.route_module ausente")
  ];

  for (const check of checks) {
    if (check) {
      issues.push(check);
    }
  }

  if (request.channels.form_enabled && !(config.form?.fields?.length > 0)) {
    issues.push({ level: "blocker", message: "form_enabled=true mas nenhum campo de formulario foi definido" });
  }

  if (request.channels.whatsapp_enabled && !request.uses_whatsbot) {
    issues.push({
      level: "warning",
      message: "whatsapp_enabled=true sem uses_whatsbot=true. Integracao WhatsBot ainda nao sera provisionada."
    });
  }

  if (config.lead_routing.clickup_enabled && !String(config.lead_routing.clickup_list_id || "").trim()) {
    issues.push({ level: "blocker", message: "clickup_enabled=true sem clickup_list_id" });
  }

  if (config.lead_routing.telegram_enabled && !String(config.lead_routing.telegram_chat_id || "").trim()) {
    issues.push({ level: "blocker", message: "telegram_enabled=true sem telegram_chat_id" });
  }

  const clickupId = String(config.lead_routing.clickup_list_id || "").trim();
  const telegramId = String(config.lead_routing.telegram_chat_id || "").trim();
  if (request.operational_mode === "production") {
    if (!clickupId) {
      issues.push({
        level: "blocker",
        message: "operational_mode=production exige clickup_list_id definido"
      });
    }
    if (!telegramId) {
      issues.push({
        level: "blocker",
        message: "operational_mode=production exige telegram_chat_id definido"
      });
    }
  }

  if (request.channels.site_sdr_enabled || request.channels.form_enabled) {
    if (!clickupId && !telegramId) {
      issues.push({
        level: "blocker",
        message: "nenhum destino operacional definido (ClickUp/Telegram) para canais ativos"
      });
    }
  }

  if (mode === "apply" && !approved) {
    issues.push({
      level: "blocker",
      message: "apply solicitado sem --approved. Gate humano obrigatorio."
    });
  }

  const configPath = path.resolve(repoRoot, "config", "clients", `${clientSlug}.json`);
  const knowledgePath = path.resolve(repoRoot, "knowledge", "clients", clientSlug);
  const alreadyExists = pathExists(configPath) || pathExists(knowledgePath);
  if (mode === "apply" && alreadyExists && !allowOverwrite) {
    issues.push({
      level: "blocker",
      message: `cliente ${clientSlug} ja existe. Use --allow-overwrite para sobrescrever.`
    });
  }

  const payloadShape = {
    required_context: [
      "client_slug",
      "segment",
      "canal",
      "operational_mode",
      "site_origin",
      "page_path",
      "referrer",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term"
    ]
  };

  return {
    blockers: issues.filter((item) => item.level === "blocker"),
    warnings: issues.filter((item) => item.level === "warning"),
    payloadShape
  };
}
