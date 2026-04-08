import { collectTrackingContext } from "../tracking/context.js";

export function buildSdrPayload({ message, conversationId, visitorId, stateSnapshot, config }) {
  const tracking = collectTrackingContext();
  const pageContext = config?.page_context || {};
  const sdr = config?.sdr || {};
  const baseOrigin = sdr.origin_label || `site_widget_${config?.client_slug || "template"}`;
  const resolvedOrigin = config?.demo_mode ? `DEMO_${baseOrigin}` : baseOrigin;

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
    state_snapshot: stateSnapshot,
    device_type: window.innerWidth < 768 ? "mobile" : "desktop",
    client_slug: config?.client_slug || null,
    segment: config?.segment || null,
    demo_mode: Boolean(config?.demo_mode),
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
    collect_fields: Array.isArray(sdr.collect_fields) ? sdr.collect_fields : []
  };
}
