export default function handler(req, res) {
  const backendConfigured = Boolean(
    String(process.env.BACKEND_BASE_URL || process.env.SDR_API_BASE_URL || process.env.VITE_SDR_API_BASE_URL || "").trim()
  );
  const siteClientSlug = process.env.SITE_CLIENT_SLUG || "";
  const demoModeRaw = process.env.DEMO_MODE || "";
  const operationalModeRaw = process.env.OPERATIONAL_MODE || "";
  const demoMode = ["1", "true", "yes", "on"].includes(String(demoModeRaw).toLowerCase());
  const operationalMode = String(operationalModeRaw || "").trim() || "";

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    localApiBaseUrl: "/api",
    proxyEnabled: true,
    backendConfigured,
    siteClientSlug,
    demoMode,
    operationalMode
  });
}
