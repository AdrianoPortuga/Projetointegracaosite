function resolveBackendBaseUrl() {
  const baseUrl =
    process.env.BACKEND_BASE_URL ||
    process.env.SDR_API_BASE_URL ||
    process.env.VITE_SDR_API_BASE_URL ||
    "";
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

function readRawBody(req) {
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object") return JSON.stringify(req.body);
  return "";
}

function applyCorsHeaders(req, res) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,Accept,Origin,X-API-Token"
  );
}

export async function proxyToBackend(req, res, { proxyName, targetPath, includeLeadToken = false }) {
  applyCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed", allowed: ["POST", "OPTIONS"] });
    return;
  }

  const backendBaseUrl = resolveBackendBaseUrl();
  if (!backendBaseUrl) {
    console.error(`[proxy:${proxyName}] backend_base_url_missing`);
    res.status(500).json({ error: "backend_base_url_missing" });
    return;
  }

  const upstreamUrl = `${backendBaseUrl}${targetPath}`;
  const headers = {
    "Content-Type": req.headers["content-type"] || "application/json",
    Accept: req.headers.accept || "application/json"
  };

  if (req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  }

  if (includeLeadToken) {
    const serverToken = process.env.LEAD_API_TOKEN || process.env.CODESAGENCY_API_TOKEN || "";
    if (serverToken) {
      headers["X-API-Token"] = serverToken;
    } else if (req.headers["x-api-token"]) {
      headers["X-API-Token"] = req.headers["x-api-token"];
    }
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body: readRawBody(req)
    });

    const responseText = await upstreamResponse.text();
    const contentType = upstreamResponse.headers.get("content-type") || "application/json; charset=utf-8";

    console.info(`[proxy:${proxyName}] upstream_status=${upstreamResponse.status}`);
    res.status(upstreamResponse.status);
    res.setHeader("Content-Type", contentType);
    res.send(responseText);
  } catch (error) {
    console.error(`[proxy:${proxyName}] upstream_error`, error?.message || error);
    res.status(502).json({ error: "upstream_unreachable" });
  }
}
