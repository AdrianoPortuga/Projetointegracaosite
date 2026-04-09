import { collectTrackingContext } from "../tracking/context.js";
import { buildNamespace } from "./namespace.js";

export function buildFormPayload({ formData, config, trackingOverride }) {
  const tracking = trackingOverride || collectTrackingContext();
  const routing = config?.lead_routing || {};
  const baseOrigin = routing.form_origin_label || `site_form_${config?.client_slug || "template"}`;
  const operationalMode = config?.operational_mode || (config?.demo_mode ? "demo" : "production");
  const resolvedOrigin = operationalMode === "demo" ? `DEMO_${baseOrigin}` : baseOrigin;
  const canal = "form";
  const namespace = buildNamespace(config, canal);

  const extraFields = Object.fromEntries(
    Object.entries(formData || {}).filter(([key]) => !["nome", "email", "telefone", "mensagem"].includes(key))
  );

  return {
    nome: formData.nome || "Lead sem nome",
    email: formData.email || null,
    telefone: formData.telefone || null,
    mensagem: formData.mensagem || null,
    origem: resolvedOrigin,
    canal,
    namespace,
    site_origin: tracking.site_origin,
    current_url: tracking.current_url,
    page_path: tracking.page_path,
    referrer: tracking.referrer,
    client_slug: config?.client_slug || null,
    segment: config?.segment || null,
    operational_mode: operationalMode,
    demo_mode: operationalMode === "demo",
    clickup_enabled: Boolean(routing.clickup_enabled),
    telegram_enabled: Boolean(routing.telegram_enabled),
    clickup_list_id: routing.clickup_list_id || null,
    telegram_chat_id: routing.telegram_chat_id || null,
    route_module: routing.route_module || "chat_atendimento",
    utm_source: tracking.utm_source,
    utm_medium: tracking.utm_medium,
    utm_campaign: tracking.utm_campaign,
    metadata: {
      site_origin: tracking.site_origin,
      current_url: tracking.current_url,
      page_path: tracking.page_path,
      referrer: tracking.referrer,
      utm_content: tracking.utm_content,
      utm_term: tracking.utm_term,
      client_slug: config?.client_slug || null,
      segment: config?.segment || null,
      demo_mode: Boolean(config?.demo_mode),
      extra_fields: extraFields
    }
  };
}
