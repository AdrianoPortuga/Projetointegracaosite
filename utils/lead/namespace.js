export function buildNamespace(config, channel) {
  const client = String(config?.client_slug || "unknown_client");
  const segment = String(config?.segment || "unknown_segment");
  const mode = String(config?.operational_mode || "demo");
  const canal = String(channel || "site_sdr");
  return `${client}::${segment}::${mode}::${canal}`;
}
