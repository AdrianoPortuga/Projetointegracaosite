function deepMerge(base, override) {
  const output = { ...(base || {}) };
  for (const [key, value] of Object.entries(override || {})) {
    if (Array.isArray(value)) {
      output[key] = value;
      continue;
    }
    if (value && typeof value === "object") {
      output[key] = deepMerge(output[key], value);
      continue;
    }
    output[key] = value;
  }
  return output;
}

function resolveClientSlug() {
  const url = new URL(window.location.href);
  const byQuery = url.searchParams.get("client");
  if (byQuery) return byQuery;
  const byMeta = document.querySelector('meta[name="site-client-slug"]')?.getAttribute("content");
  if (byMeta) return byMeta;
  return "codestech-demo";
}

async function fetchJson(path) {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Falha ao carregar ${path}: HTTP ${response.status}`);
  }
  return response.json();
}

async function resolveApiBaseUrl() {
  try {
    const response = await fetch("/api/sdr-config", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) return null;
    const data = await response.json();
    return String(data.apiBaseUrl || "").trim() || null;
  } catch {
    return null;
  }
}

export async function loadSiteConfig() {
  const clientSlug = resolveClientSlug();
  const clientPath = `/config/clients/${clientSlug}.json`;
  const clientConfig = await fetchJson(clientPath);
  const segmentPath = `/config/segments/${clientConfig.segment}.json`;
  const segmentConfig = await fetchJson(segmentPath);
  const merged = deepMerge(segmentConfig, clientConfig);
  merged.page_context = resolvePageContext(window.location.pathname, merged.segment);

  window.__SITE_CONFIG__ = merged;
  window.__SDR_WIDGET_CONFIG__ = {
    ...(window.__SDR_WIDGET_CONFIG__ || {}),
    apiBaseUrl: await resolveApiBaseUrl()
  };

  return merged;
}
import { resolvePageContext } from "../utils/lead/resolvePageContext.js";
