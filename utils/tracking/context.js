export function collectTrackingContext() {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  return {
    site_origin: window.location.origin || null,
    current_url: url.href || null,
    page_path: url.pathname || "/",
    referrer: document.referrer || null,
    utm_source: params.get("utm_source") || null,
    utm_medium: params.get("utm_medium") || null,
    utm_campaign: params.get("utm_campaign") || null,
    utm_content: params.get("utm_content") || null,
    utm_term: params.get("utm_term") || null
  };
}
