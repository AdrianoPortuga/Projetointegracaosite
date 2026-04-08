import fs from "node:fs";
import path from "node:path";

const [clientSlug, segment = "clinica_estetica"] = process.argv.slice(2);

if (!clientSlug) {
  console.error("Uso: node scripts/create-client-config.mjs <client-slug> [segment]");
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), "config", "clients", `${clientSlug}.json`);
if (fs.existsSync(filePath)) {
  console.error(`Arquivo já existe: ${filePath}`);
  process.exit(1);
}

const payload = {
  client_slug: clientSlug,
  segment,
  brand: {
    name: "Novo Cliente",
    headline: "Edite este headline",
    description: "Edite a descrição comercial.",
    primary_cta: "Quero atendimento",
    primary_cta_href: "#lead-form-container"
  },
  channels: {
    site_sdr_enabled: true,
    form_enabled: true,
    whatsapp_enabled: true,
    whatsapp_number: ""
  },
  lead_routing: {
    telegram_enabled: true,
    clickup_enabled: true
  },
  sdr: {
    origin_label: `site_widget_${clientSlug}`,
    chat_title: "SDR Virtual",
    opening_message: "Olá, como posso ajudar?",
    input_placeholder: "Digite sua necessidade"
  },
  faq: [],
  offers: []
};

fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Cliente criado: ${filePath}`);
