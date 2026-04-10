import fs from "node:fs";
import path from "node:path";
import sdrHandler from "../api/sdr/chat.js";
import leadHandler from "../api/lead/codesagency.js";
import { buildSdrPayload } from "../utils/lead/sdrPayload.js";
import { buildFormPayload } from "../utils/lead/formPayload.js";

const repoRoot = process.cwd();
const clientSlug = "almeida-torres-advocacia";
const clientConfigPath = path.resolve(repoRoot, "config", "clients", `${clientSlug}.json`);
const clientPagePath = path.resolve(repoRoot, "clients", clientSlug, "index.html");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = JSON.stringify(payload);
      this.ended = true;
      return this;
    },
    send(payload) {
      this.body = payload;
      this.ended = true;
      return this;
    },
    end(payload = "") {
      this.body = payload;
      this.ended = true;
      return this;
    }
  };
}

async function testClientFiles() {
  assert(fs.existsSync(clientConfigPath), `Arquivo de config ausente: ${clientConfigPath}`);
  assert(fs.existsSync(clientPagePath), `Pagina do cliente ausente: ${clientPagePath}`);

  const config = JSON.parse(fs.readFileSync(clientConfigPath, "utf8"));
  const html = fs.readFileSync(clientPagePath, "utf8");

  assert(config.client_slug === clientSlug, "client_slug inconsistente");
  assert(config.segment === "advocacia", "segment inconsistente para homologacao advocacia");
  assert(config.channels.site_sdr_enabled === true, "SDR deve estar habilitado");
  assert(config.channels.form_enabled === true, "Formulario deve estar habilitado");
  assert(config.lead_routing.sdr_endpoint_path === "/api/sdr/chat", "endpoint SDR invalido");
  assert(config.lead_routing.form_endpoint_path === "/api/lead/codesagency", "endpoint Form invalido");
  assert(html.includes('meta name="site-client-slug" content="almeida-torres-advocacia"'), "meta slug ausente na pagina");
  assert(html.includes('src="/scripts/bootstrap.js"'), "bootstrap script ausente na pagina");
}

async function testPayloads() {
  const config = JSON.parse(fs.readFileSync(clientConfigPath, "utf8"));
  global.window = {
    innerWidth: 1024,
    location: {
      href: "http://localhost:4173/clients/almeida-torres-advocacia/",
      pathname: "/clients/almeida-torres-advocacia/",
      origin: "http://localhost:4173"
    }
  };

  const tracking = {
    site_origin: "http://localhost:4173",
    current_url: "http://localhost:4173/clients/almeida-torres-advocacia/?utm_source=smoke",
    page_path: "/clients/almeida-torres-advocacia/",
    referrer: "",
    utm_source: "smoke",
    utm_medium: "script",
    utm_campaign: "homolog",
    utm_content: null,
    utm_term: null
  };

  const sdrPayload = buildSdrPayload({
    message: "Teste de smoke",
    conversationId: "conv-smoke-1",
    visitorId: "visitor-smoke-1",
    stateSnapshot: null,
    config,
    trackingOverride: tracking
  });

  const formPayload = buildFormPayload({
    formData: {
      nome: "Teste Smoke",
      email: "smoke@example.com",
      telefone: "+351900000000",
      mensagem: "Mensagem de teste"
    },
    config,
    trackingOverride: tracking
  });

  assert(sdrPayload.client_slug === clientSlug, "payload SDR sem client_slug");
  assert(sdrPayload.canal === "site_sdr", "payload SDR sem canal correto");
  assert(formPayload.client_slug === clientSlug, "payload Form sem client_slug");
  assert(formPayload.canal === "form", "payload Form sem canal correto");
}

async function testProxyEndpoints() {
  const originalFetch = global.fetch;
  const originalBackendUrl = process.env.BACKEND_BASE_URL;
  const originalLeadToken = process.env.LEAD_API_TOKEN;

  process.env.BACKEND_BASE_URL = "https://example.test";
  process.env.LEAD_API_TOKEN = "TOKEN_HOMOLOG";

  let captured = [];
  global.fetch = async (url, init) => {
    captured.push({ url, init });
    return {
      status: 200,
      headers: new Map([["content-type", "application/json"]]),
      text: async () => JSON.stringify({ ok: true, echoed_url: url })
    };
  };

  const sdrReq = {
    method: "POST",
    headers: {
      origin: "http://localhost:4173",
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({ message: "oi" })
  };
  const sdrRes = createMockRes();
  await sdrHandler(sdrReq, sdrRes);
  assert(sdrRes.statusCode === 200, "proxy SDR nao retornou 200");
  assert(String(captured[0]?.url || "").endsWith("/sdr/chat"), "proxy SDR nao chamou /sdr/chat");

  const leadReq = {
    method: "POST",
    headers: {
      origin: "http://localhost:4173",
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({ nome: "Lead teste" })
  };
  const leadRes = createMockRes();
  await leadHandler(leadReq, leadRes);
  assert(leadRes.statusCode === 200, "proxy lead nao retornou 200");
  assert(String(captured[1]?.url || "").endsWith("/lead/codesagency"), "proxy lead nao chamou /lead/codesagency");
  assert(captured[1]?.init?.headers?.["X-API-Token"] === "TOKEN_HOMOLOG", "proxy lead sem token server-side");

  const optReq = { method: "OPTIONS", headers: { origin: "http://localhost:4173" }, body: "" };
  const optRes = createMockRes();
  await sdrHandler(optReq, optRes);
  assert(optRes.statusCode === 204, "preflight OPTIONS do SDR nao retornou 204");

  global.fetch = originalFetch;
  process.env.BACKEND_BASE_URL = originalBackendUrl;
  process.env.LEAD_API_TOKEN = originalLeadToken;
}

async function run() {
  await testClientFiles();
  await testPayloads();
  await testProxyEndpoints();
  console.log("OK: smoke homologacao almeida-torres-advocacia");
}

run().catch((error) => {
  console.error("FALHA:", error.message);
  process.exit(1);
});

