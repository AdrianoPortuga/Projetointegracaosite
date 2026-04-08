import { collectTrackingContext } from "../tracking/context.js";

export function buildFormPayload({ formData, config }) {
  const tracking = collectTrackingContext();
  const baseOrigin = config?.lead_routing?.form_origin_label || `site_form_${config?.client_slug || "template"}`;
  const resolvedOrigin = config?.demo_mode ? `DEMO_${baseOrigin}` : baseOrigin;

  const extraFields = Object.fromEntries(
    Object.entries(formData || {}).filter(([key]) => !["nome", "email", "telefone", "mensagem"].includes(key))
  );

  return {
    nome: formData.nome || "Lead sem nome",
    email: formData.email || null,
    telefone: formData.telefone || null,
    mensagem: formData.mensagem || null,
    origem: resolvedOrigin,
    site_origin: tracking.site_origin,
    current_url: tracking.current_url,
    page_path: tracking.page_path,
    referrer: tracking.referrer,
    client_slug: config?.client_slug || null,
    segment: config?.segment || null,
    demo_mode: Boolean(config?.demo_mode),
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
