import fs from "node:fs";
import path from "node:path";

function readText(relativePath) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const requiredClients = ["advocacia-demo", "AgenciaCarro-demo", "imobiliaria-demo"];
for (const slug of requiredClients) {
  const client = readJson(`config/clients/${slug}.json`);
  assert(client.client_slug === slug, `${slug}: client_slug incorreto`);
  assert(client.operational_mode, `${slug}: operational_mode ausente`);
  assert(client.channels?.site_sdr_enabled === true, `${slug}: site_sdr_enabled deve ser true`);
  assert(typeof client.lead_routing?.clickup_enabled === "boolean", `${slug}: clickup_enabled ausente`);
  assert(typeof client.lead_routing?.telegram_enabled === "boolean", `${slug}: telegram_enabled ausente`);
  assert(client.lead_routing?.clickup_list_id, `${slug}: clickup_list_id ausente`);
  assert(client.lead_routing?.telegram_chat_id, `${slug}: telegram_chat_id ausente`);
  assert(Array.isArray(client.sdr?.collect_fields), `${slug}: sdr.collect_fields ausente`);
  assert(Array.isArray(client.form?.fields), `${slug}: form.fields ausente`);

  const root = path.resolve(process.cwd(), "knowledge", "clients", slug);
  for (const file of [
    "business_profile.json",
    "faq.json",
    "offers.json",
    "qualification_rules.json",
    "handoff_rules.json",
    "change_log.md"
  ]) {
    assert(fs.existsSync(path.join(root, file)), `${slug}: arquivo knowledge ausente -> ${file}`);
  }
}

const sdrPayloadText = readText("utils/lead/sdrPayload.js");
for (const key of [
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
  "utm_term",
  "clickup_list_id",
  "telegram_chat_id"
]) {
  assert(sdrPayloadText.includes(key), `sdrPayload sem campo obrigatório: ${key}`);
}

const formPayloadText = readText("utils/lead/formPayload.js");
for (const key of [
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
  "utm_term",
  "clickup_list_id",
  "telegram_chat_id"
]) {
  assert(formPayloadText.includes(key), `formPayload sem campo obrigatório: ${key}`);
}

const sdrWidgetText = readText("components/sdr/initSdrWidget.js");
assert(sdrWidgetText.includes("buildNamespace"), "SDR sem namespace por cliente/canal");

const formRendererText = readText("components/forms/renderLeadForm.js");
assert(formRendererText.includes("resolveFormFields"), "Form sem validação/campos por cliente");

console.log("operational_validation_ok");
