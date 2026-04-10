import { proxyToBackend } from "../_lib/proxy.js";

export default async function handler(req, res) {
  return proxyToBackend(req, res, {
    proxyName: "sdr_chat",
    targetPath: "/sdr/chat",
    includeLeadToken: false
  });
}
