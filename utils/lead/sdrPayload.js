import { collectTrackingContext } from "../tracking/context.js";
import { buildNamespace } from "./namespace.js";

export function buildSdrPayload({ message, conversationId, visitorId, stateSnapshot, config, trackingOverride }) {
  const tracking = trackingOverride || collectTrackingContext();
  const pageContext = config?.page_context || {};
  const sdr = config?.sdr || {};
  const knowledge = config?.knowledge || {};
  const routing = config?.lead_routing || {};
  const baseOrigin = sdr.origin_label || `site_widget_${config?.client_slug || "template"}`;
  const operationalMode = config?.operational_mode || (config?.demo_mode ? "demo" : "production");
  const resolvedOrigin = operationalMode === "demo" ? `DEMO_${baseOrigin}` : baseOrigin;
  const canal = "site_sdr";
  const namespace = buildNamespace(config, canal);

  return {
    conversation_id: conversationId,
    visitor_id: visitorId,
    message,
    page_url: tracking.current_url || window.location.href,
    page_slug: tracking.page_path || window.location.pathname,
    page_type: pageContext.page_type || "unknown",
    serviceId: pageContext.serviceId || null,
    product_focus: pageContext.product_focus || "geral",
    origin: resolvedOrigin,
    canal,
    namespace,
    state_snapshot: stateSnapshot,
    device_type: window.innerWidth < 768 ? "mobile" : "desktop",
    client_slug: config?.client_slug || null,
    segment: config?.segment || null,
    operational_mode: operationalMode,
    demo_mode: operationalMode === "demo",
    clickup_enabled: Boolean(routing.clickup_enabled),
    telegram_enabled: Boolean(routing.telegram_enabled),
    clickup_list_id: routing.clickup_list_id || null,
    telegram_chat_id: routing.telegram_chat_id || null,
    route_module: routing.route_module || "chat_atendimento",
    site_origin: tracking.site_origin,
    current_url: tracking.current_url,
    page_path: tracking.page_path,
    referrer: tracking.referrer,
    utm_source: tracking.utm_source,
    utm_medium: tracking.utm_medium,
    utm_campaign: tracking.utm_campaign,
    utm_content: tracking.utm_content,
    utm_term: tracking.utm_term,
    sdr_goal: sdr.goal || null,
    sdr_tone: sdr.tone || null,
    collect_fields: Array.isArray(sdr.collect_fields) ? sdr.collect_fields : [],
    qualification_rules: sdr?.knowledge_overrides?.qualification_rules || knowledge?.qualification_rules || {},
    handoff_rules: sdr?.knowledge_overrides?.handoff_rules || knowledge?.handoff_rules || {}
  };
}
