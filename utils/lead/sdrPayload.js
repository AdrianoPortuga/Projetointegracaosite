import { collectTrackingContext } from "../tracking/context.js";

export function buildSdrPayload({ message, conversationId, visitorId, stateSnapshot, conversationText, caseSummary, config, trackingOverride }) {
  const tracking = trackingOverride || collectTrackingContext();
  const pageContext = config?.page_context || {};
  const sdr = config?.sdr || {};
  const baseOrigin = sdr.origin_label || `site_widget_${config?.client_slug || "template"}`;
  const operationalMode = config?.operational_mode || (config?.demo_mode ? "demo" : "production");
  const resolvedOrigin = operationalMode === "demo" ? `DEMO_${baseOrigin}` : baseOrigin;
  const channel = "site_sdr";

  return {
    conversation_id: conversationId,
    visitor_id: visitorId,
    message,
    client_slug: config?.client_slug || null,
    segment: config?.segment || null,
    mode: operationalMode,
    channel,
    page_url: tracking.current_url || window.location.href,
    page_slug: tracking.page_path || window.location.pathname,
    page_type: pageContext.page_type || "unknown",
    serviceId: pageContext.serviceId || null,
    product_focus: pageContext.product_focus || "geral",
    origin: resolvedOrigin,
    device_type: window.innerWidth < 768 ? "mobile" : "desktop",
    site_origin: tracking.site_origin,
    current_url: tracking.current_url,
    page_path: tracking.page_path,
    referrer: tracking.referrer,
    utm_source: tracking.utm_source,
    utm_medium: tracking.utm_medium,
    utm_campaign: tracking.utm_campaign,
    utm_content: tracking.utm_content,
    utm_term: tracking.utm_term
  };
}
