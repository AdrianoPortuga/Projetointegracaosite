import { resolvePageContext } from "../utils/lead/resolvePageContext.js";

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

async function fetchJson(path) {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Falha ao carregar ${path}: HTTP ${response.status}`);
  }
  return response.json();
}

async function fetchRuntimeConfig() {
  try {
    const response = await fetch("/api/sdr-config", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) return {};
    const data = await response.json();
    return {
      apiBaseUrl: String(data.apiBaseUrl || "").trim() || null,
      siteClientSlug: String(data.siteClientSlug || "").trim() || null,
      demoMode: typeof data.demoMode === "boolean" ? data.demoMode : null
    };
  } catch {
    return {};
  }
}

function resolveClientSlug(runtimeConfig) {
  if (runtimeConfig?.siteClientSlug) {
    return runtimeConfig.siteClientSlug;
  }

  const byMeta = document.querySelector('meta[name="site-client-slug"]')?.getAttribute("content");
  if (byMeta && byMeta.trim()) {
    return byMeta.trim();
  }

  const byQuery = new URL(window.location.href).searchParams.get("client");
  if (byQuery && byQuery.trim()) {
    return byQuery.trim();
  }

  return "advocacia-demo";
}

function resolveDemoMode(mergedConfig, runtimeConfig) {
  if (typeof runtimeConfig?.demoMode === "boolean") {
    return runtimeConfig.demoMode;
  }
  if (typeof mergedConfig?.demo_mode === "boolean") {
    return mergedConfig.demo_mode;
  }
  return false;
}

export async function loadSiteConfig() {
  const runtimeConfig = await fetchRuntimeConfig();
  const clientSlug = resolveClientSlug(runtimeConfig);
  const clientPath = `/config/clients/${clientSlug}.json`;
  const clientConfig = await fetchJson(clientPath);
  const segmentPath = `/config/segments/${clientConfig.segment}.json`;
  const segmentConfig = await fetchJson(segmentPath);

  const merged = deepMerge(segmentConfig, clientConfig);
  merged.client_slug = merged.client_slug || clientSlug;
  merged.page_context = resolvePageContext(window.location.pathname, merged.segment);
  merged.demo_mode = resolveDemoMode(merged, runtimeConfig);

  window.__SITE_RUNTIME_CONFIG__ = runtimeConfig;
  window.__SITE_CONFIG__ = merged;
  window.__SDR_WIDGET_CONFIG__ = {
    ...(window.__SDR_WIDGET_CONFIG__ || {}),
    apiBaseUrl: runtimeConfig.apiBaseUrl || null
  };

  return merged;
}
