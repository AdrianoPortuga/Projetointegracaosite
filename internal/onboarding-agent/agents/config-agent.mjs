import path from "node:path";
import { readJson, safeSlug } from "../lib/io.mjs";

function readSegmentBase(repoRoot, segment) {
  const segmentPath = path.resolve(repoRoot, "config", "segments", `${segment}.json`);
  try {
    return readJson(segmentPath);
  } catch {
    return null;
  }
}

export function runConfigAgent({ request, repoRoot }) {
  const segmentBase = readSegmentBase(repoRoot, request.segment);
  const clientSlug = safeSlug(request.client_slug);
  const segmentSlug = safeSlug(request.segment);

  const config = {
    client_slug: clientSlug,
    segment: segmentSlug,
    operational_mode: request.operational_mode,
    demo_mode: request.operational_mode === "demo",
    brand: {
      name: request.brand.name,
      headline: request.brand.headline,
      description:
        request.brand.description ||
        segmentBase?.brand?.description ||
        `Implantacao ${segmentSlug} para ${request.brand.name}`,
      primary_cta: request.brand.primary_cta,
      primary_cta_href: request.brand.primary_cta_href || "#lead-form-container"
    },
    channels: {
      site_sdr_enabled: request.channels.site_sdr_enabled,
      form_enabled: request.channels.form_enabled,
      whatsapp_enabled: request.channels.whatsapp_enabled,
      whatsapp_number: request.whatsapp_number || ""
    },
    lead_routing: {
      telegram_enabled: Boolean(request.telegram_chat_id),
      clickup_enabled: Boolean(request.clickup_list_id),
      clickup_list_id: request.clickup_list_id || "",
      telegram_chat_id: request.telegram_chat_id || "",
      sdr_endpoint_path: "/api/sdr/chat",
      form_endpoint_path: "/api/lead/codesagency",
      form_origin_label: `site_form_${clientSlug}`,
      demo_allow_live_submit: request.operational_mode !== "production",
      route_module: "chat_atendimento"
    },
    sdr: {
      tone: request.sdr?.tone || segmentBase?.sdr?.tone || "consultivo_comercial",
      goal: request.sdr?.goal || segmentBase?.sdr?.goal || "qualificar lead para handoff",
      collect_fields:
        request.sdr?.collect_fields ||
        segmentBase?.sdr?.collect_fields || ["nome", "telefone", "mensagem"],
      handoff_trigger:
        request.sdr?.handoff_trigger ||
        segmentBase?.sdr?.handoff_trigger ||
        "pedido_de_atendimento",
      origin_label: `site_widget_${clientSlug}`,
      chat_title: request.sdr?.chat_title || `${request.brand.name} - SDR`,
      opening_message:
        request.sdr?.opening_message || "Descreva seu contexto para eu indicar o proximo passo.",
      input_placeholder:
        request.sdr?.input_placeholder || "Ex: Quero mais detalhes sobre o servico"
    },
    form: {
      fields: request.form_fields || [
        { name: "nome", label: "Nome", type: "text", required: true },
        { name: "email", label: "E-mail", type: "email", required: true },
        { name: "telefone", label: "Telefone", type: "tel", required: true },
        { name: "mensagem", label: "Mensagem", type: "textarea", required: false }
      ]
    },
    faq: request.faq,
    offers: request.offers
  };

  return {
    artifacts: [
      {
        relativePath: path.join("config", "clients", `${clientSlug}.json`),
        content: config
      }
    ],
    meta: {
      segmentBaseFound: Boolean(segmentBase)
    }
  };
}

