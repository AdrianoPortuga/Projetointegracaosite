import { proxyToBackend } from "../_lib/proxy.js";

export default async function handler(req, res) {
  return proxyToBackend(req, res, {
    proxyName: "lead_codesagency",
    targetPath: "/lead/codesagency",
    includeLeadToken: true
  });
}
