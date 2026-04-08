export default function handler(req, res) {
  const apiBaseUrl = process.env.SDR_API_BASE_URL || process.env.VITE_SDR_API_BASE_URL || "";
  const siteClientSlug = process.env.SITE_CLIENT_SLUG || "";
  const demoModeRaw = process.env.DEMO_MODE || "";
  const demoMode = ["1", "true", "yes", "on"].includes(String(demoModeRaw).toLowerCase());

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    apiBaseUrl,
    siteClientSlug,
    demoMode
  });
}
