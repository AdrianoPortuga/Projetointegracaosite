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

async function fetchJson(path, { optional = false } = {}) {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    if (optional) return null;
    throw new Error(`Falha ao carregar ${path}: HTTP ${response.status}`);
  }
  return response.json();
}

async function fetchText(path, { optional = false } = {}) {
  const response = await fetch(path, { headers: { Accept: "text/plain" } });
  if (!response.ok) {
    if (optional) return null;
    throw new Error(`Falha ao carregar ${path}: HTTP ${response.status}`);
  }
  return response.text();
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
      demoMode: typeof data.demoMode === "boolean" ? data.demoMode : null,
      operationalMode: String(data.operationalMode || "").trim() || null
    };
  } catch {
    return {};
  }
}

function resolveClientSlug(runtimeConfig) {
  if (runtimeConfig?.siteClientSlug) return runtimeConfig.siteClientSlug;
  const byMeta = document.querySelector('meta[name="site-client-slug"]')?.getAttribute("content");
  if (byMeta && byMeta.trim()) return byMeta.trim();
  const byQuery = new URL(window.location.href).searchParams.get("client");
  if (byQuery && byQuery.trim()) return byQuery.trim();
  return "advocacia-demo";
}

function resolveOperationalMode(mergedConfig, runtimeConfig) {
  if (runtimeConfig?.operationalMode && ["demo", "production"].includes(runtimeConfig.operationalMode)) {
    return runtimeConfig.operationalMode;
  }
  if (mergedConfig?.operational_mode && ["demo", "production"].includes(mergedConfig.operational_mode)) {
    return mergedConfig.operational_mode;
  }
  if (typeof runtimeConfig?.demoMode === "boolean") {
    return runtimeConfig.demoMode ? "demo" : "production";
  }
  if (typeof mergedConfig?.demo_mode === "boolean") {
    return mergedConfig.demo_mode ? "demo" : "production";
  }
  return "demo";
}

async function loadClientKnowledge(clientSlug) {
  const root = `/knowledge/clients/${clientSlug}`;
  const [businessProfile, faq, offers, qualificationRules, handoffRules, changeLog] = await Promise.all([
    fetchJson(`${root}/business_profile.json`, { optional: true }),
    fetchJson(`${root}/faq.json`, { optional: true }),
    fetchJson(`${root}/offers.json`, { optional: true }),
    fetchJson(`${root}/qualification_rules.json`, { optional: true }),
    fetchJson(`${root}/handoff_rules.json`, { optional: true }),
    fetchText(`${root}/change_log.md`, { optional: true })
  ]);

  return {
    business_profile: businessProfile || {},
    faq: Array.isArray(faq) ? faq : [],
    offers: Array.isArray(offers) ? offers : [],
    qualification_rules: qualificationRules || {},
    handoff_rules: handoffRules || {},
    change_log: changeLog || ""
  };
}

function applyKnowledgeOverrides(config, knowledge) {
  const next = { ...config };
  next.knowledge = knowledge;

  if (knowledge.business_profile?.brand_name && !next.brand?.name) {
    next.brand = { ...(next.brand || {}), name: knowledge.business_profile.brand_name };
  }
  if (knowledge.business_profile?.headline && !next.brand?.headline) {
    next.brand = { ...(next.brand || {}), headline: knowledge.business_profile.headline };
  }
  if (knowledge.business_profile?.primary_cta && !next.brand?.primary_cta) {
    next.brand = { ...(next.brand || {}), primary_cta: knowledge.business_profile.primary_cta };
  }

  if ((!Array.isArray(next.faq) || !next.faq.length) && Array.isArray(knowledge.faq) && knowledge.faq.length) {
    next.faq = knowledge.faq;
  }
  if ((!Array.isArray(next.offers) || !next.offers.length) && Array.isArray(knowledge.offers) && knowledge.offers.length) {
    next.offers = knowledge.offers;
  }

  next.sdr = {
    ...(next.sdr || {}),
    knowledge_overrides: {
      qualification_rules: knowledge.qualification_rules || {},
      handoff_rules: knowledge.handoff_rules || {}
    }
  };

  return next;
}

export async function loadSiteConfig() {
  const runtimeConfig = await fetchRuntimeConfig();
  const clientSlug = resolveClientSlug(runtimeConfig);

  const clientPath = `/config/clients/${clientSlug}.json`;
  const clientConfig = await fetchJson(clientPath);
  const segmentPath = `/config/segments/${clientConfig.segment}.json`;
  const segmentConfig = await fetchJson(segmentPath);

  const mergedBase = deepMerge(segmentConfig, clientConfig);
  const operationalMode = resolveOperationalMode(mergedBase, runtimeConfig);
  const knowledge = await loadClientKnowledge(clientSlug);

  const merged = applyKnowledgeOverrides(
    {
      ...mergedBase,
      client_slug: mergedBase.client_slug || clientSlug,
      operational_mode: operationalMode,
      demo_mode: operationalMode === "demo",
      page_context: resolvePageContext(window.location.pathname, mergedBase.segment)
    },
    knowledge
  );

  merged.namespace = `${merged.client_slug}:${merged.segment}:${merged.operational_mode}`;
  merged.modules = {
    model_1_site_sdr: Boolean(merged.channels?.site_sdr_enabled),
    model_2_site_sdr_form: Boolean(merged.channels?.site_sdr_enabled && merged.channels?.form_enabled),
    model_3_site_sdr_form_whatsapp: Boolean(
      merged.channels?.site_sdr_enabled && merged.channels?.form_enabled && merged.channels?.whatsapp_enabled
    )
  };

  window.__SITE_RUNTIME_CONFIG__ = runtimeConfig;
  window.__SITE_CONFIG__ = merged;
  window.__SDR_WIDGET_CONFIG__ = {
    ...(window.__SDR_WIDGET_CONFIG__ || {}),
    apiBaseUrl: runtimeConfig.apiBaseUrl || null
  };

  return merged;
}
