import fs from "node:fs";
import path from "node:path";

const [clientSlug, segment = "advocacia", operationalMode = "demo"] = process.argv.slice(2);

if (!clientSlug) {
  console.error("Uso: node scripts/create-client-config.mjs <client-slug> [segment] [demo|production]");
  process.exit(1);
}

if (!["demo", "production"].includes(operationalMode)) {
  console.error("operational_mode deve ser demo ou production");
  process.exit(1);
}

const configPath = path.resolve(process.cwd(), "config", "clients", `${clientSlug}.json`);
const knowledgeRoot = path.resolve(process.cwd(), "knowledge", "clients", clientSlug);
const exists = fs.existsSync(configPath) || fs.existsSync(knowledgeRoot);
if (exists) {
  console.error(`Cliente já existe: ${clientSlug}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.mkdirSync(knowledgeRoot, { recursive: true });

const configPayload = {
  client_slug: clientSlug,
  segment,
  operational_mode: operationalMode,
  brand: {
    name: "Novo Cliente",
    headline: "Edite este headline",
    description: "Edite a descricao comercial.",
    primary_cta: "Quero atendimento",
    primary_cta_href: "#lead-form-container"
  },
  channels: {
    site_sdr_enabled: true,
    form_enabled: true,
    whatsapp_enabled: false,
    whatsapp_number: ""
  },
  lead_routing: {
    telegram_enabled: true,
    clickup_enabled: true,
    clickup_list_id: "CLICKUP_LIST_ID",
    telegram_chat_id: "TELEGRAM_CHAT_ID",
    sdr_endpoint_path: "/api/sdr/chat",
    form_endpoint_path: "/api/lead/codesagency",
    form_origin_label: `site_form_${clientSlug}`,
    demo_allow_live_submit: false,
    route_module: "chat_atendimento"
  },
  sdr: {
    tone: "consultivo_comercial",
    goal: "qualificar lead e preparar handoff",
    collect_fields: ["nome", "telefone", "necessidade"],
    handoff_trigger: "pedido_de_proposta",
    origin_label: `site_widget_${clientSlug}`,
    chat_title: "SDR Virtual",
    opening_message: "Ola, como posso ajudar?",
    input_placeholder: "Digite sua necessidade"
  },
  form: {
    fields: [
      { name: "nome", label: "Nome", type: "text", required: true },
      { name: "email", label: "E-mail", type: "email", required: true },
      { name: "telefone", label: "Telefone", type: "tel", required: false },
      { name: "mensagem", label: "Mensagem", type: "textarea", required: false }
    ]
  },
  faq: [],
  offers: []
};

const businessProfile = {
  client_slug: clientSlug,
  segment,
  business_name: "Novo Cliente",
  brand_name: "Novo Cliente",
  headline: "Edite headline no business profile",
  primary_cta: "Quero atendimento",
  service_scope: [],
  target_region: "",
  differentials: []
};

const faq = [
  {
    question: "Pergunta frequente 1",
    answer: "Resposta da pergunta 1"
  }
];

const offers = [
  {
    title: "Oferta principal",
    description: "Descricao da oferta principal"
  }
];

const qualificationRules = {
  required_fields: ["nome", "telefone"],
  priority_signals: [],
  discovery_questions: []
};

const handoffRules = {
  trigger_mode: "score_or_intent",
  auto_handoff_conditions: [],
  handoff_priority_map: {
    alta: "atendimento_imediato",
    media: "atendimento_padrao"
  }
};

const changeLog = `# Change Log - ${clientSlug}\n\n- ${new Date().toISOString().slice(0, 10)}: pacote inicial criado automaticamente.\n`;

fs.writeFileSync(configPath, `${JSON.stringify(configPayload, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(knowledgeRoot, "business_profile.json"), `${JSON.stringify(businessProfile, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(knowledgeRoot, "faq.json"), `${JSON.stringify(faq, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(knowledgeRoot, "offers.json"), `${JSON.stringify(offers, null, 2)}\n`, "utf8");
fs.writeFileSync(
  path.join(knowledgeRoot, "qualification_rules.json"),
  `${JSON.stringify(qualificationRules, null, 2)}\n`,
  "utf8"
);
fs.writeFileSync(path.join(knowledgeRoot, "handoff_rules.json"), `${JSON.stringify(handoffRules, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(knowledgeRoot, "change_log.md"), changeLog, "utf8");

console.log(`Cliente criado: ${clientSlug}`);
console.log(`Config: ${configPath}`);
console.log(`Knowledge: ${knowledgeRoot}`);
