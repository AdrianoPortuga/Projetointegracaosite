import fs from "node:fs";
import path from "node:path";
import { proxyToBackend } from "../api/_lib/proxy.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relativePath) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    json(payload) {
      this.setHeader("content-type", "application/json");
      this.body = JSON.stringify(payload);
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    end() {
      this.body = this.body || "";
      return this;
    }
  };
}

const sdrWidgetCode = read("components/sdr/initSdrWidget.js");
assert(sdrWidgetCode.includes("/api/sdr/chat"), "SDR nao aponta para proxy local");

const formCode = read("components/forms/renderLeadForm.js");
assert(formCode.includes("/api/lead/codesagency"), "Form nao aponta para proxy local");

const clientsConfig = read("config/clients/advocacia-demo.json");
assert(clientsConfig.includes("\"/api/sdr/chat\""), "Cliente sem rota local de SDR");
assert(clientsConfig.includes("\"/api/lead/codesagency\""), "Cliente sem rota local de form");

const originalFetch = global.fetch;
process.env.BACKEND_BASE_URL = "https://leads-api.schoolia.online";
process.env.LEAD_API_TOKEN = "server_token_test";

global.fetch = async (_url, options) => ({
  status: 200,
  headers: new Map([["content-type", "application/json"]]),
  async text() {
    return JSON.stringify({
      ok: true,
      upstream_method: options.method
    });
  }
});

const resOptions = createMockRes();
await proxyToBackend(
  {
    method: "OPTIONS",
    headers: { origin: "https://codestech-demo-advocacia.vercel.app" },
    body: {}
  },
  resOptions,
  { proxyName: "test_options", targetPath: "/sdr/chat" }
);
assert(resOptions.statusCode === 204, "OPTIONS do proxy deve retornar 204");

const resPost = createMockRes();
await proxyToBackend(
  {
    method: "POST",
    headers: {
      origin: "https://codestech-demo-advocacia.vercel.app",
      "content-type": "application/json",
      accept: "application/json"
    },
    body: { message: "teste" }
  },
  resPost,
  { proxyName: "test_post", targetPath: "/lead/codesagency", includeLeadToken: true }
);
assert(resPost.statusCode === 200, "POST proxy deve retornar status upstream");
assert(resPost.body.includes("\"ok\":true"), "POST proxy deve repassar body upstream");

global.fetch = originalFetch;
console.log("proxy_validation_ok");
