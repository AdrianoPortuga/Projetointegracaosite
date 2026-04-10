import path from "node:path";
import { safeSlug } from "../lib/io.mjs";

export function runKnowledgeAgent({ request }) {
  const clientSlug = safeSlug(request.client_slug);
  const segment = safeSlug(request.segment);
  const root = path.join("knowledge", "clients", clientSlug);
  const today = new Date().toISOString().slice(0, 10);

  const businessProfile = {
    client_slug: clientSlug,
    segment,
    business_name: request.brand.name,
    brand_name: request.brand.name,
    headline: request.brand.headline,
    primary_cta: request.brand.primary_cta,
    service_scope: request.service_scope || request.offers.map((offer) => offer.title),
    target_region: request.target_region || "",
    differentials: request.differentials || []
  };

  const qualificationRules = {
    required_fields: request.sdr?.collect_fields || ["nome", "telefone"],
    priority_signals: request.priority_signals || [],
    discovery_questions: request.discovery_questions || []
  };

  const handoffRules = {
    trigger_mode: "score_or_intent",
    auto_handoff_conditions: request.auto_handoff_conditions || [],
    handoff_priority_map: request.handoff_priority_map || {
      alta: "atendimento_imediato",
      media: "atendimento_padrao"
    }
  };

  const changeLog =
    `# Change Log - ${clientSlug}\n\n` +
    `- ${today}: pacote inicial gerado pelo Codestech Onboarding Agent MVP.\n`;

  return {
    artifacts: [
      { relativePath: path.join(root, "business_profile.json"), content: businessProfile },
      { relativePath: path.join(root, "faq.json"), content: request.faq },
      { relativePath: path.join(root, "offers.json"), content: request.offers },
      { relativePath: path.join(root, "qualification_rules.json"), content: qualificationRules },
      { relativePath: path.join(root, "handoff_rules.json"), content: handoffRules },
      { relativePath: path.join(root, "change_log.md"), content: changeLog, type: "text" }
    ]
  };
}

