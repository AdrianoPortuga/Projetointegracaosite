export function applyBrandingTokens(config) {
  const brand = config?.brand || {};
  document.title = `${brand.name || "Codestech"} | Site Template`;
}
