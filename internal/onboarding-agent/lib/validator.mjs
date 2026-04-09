const REQUIRED_TOP_LEVEL = [
  "client_slug",
  "segment",
  "operational_mode",
  "channels",
  "brand",
  "offers",
  "faq",
  "clickup_list_id",
  "telegram_chat_id",
  "uses_whatsbot",
  "site_domain",
  "vercel_project_name"
];

export function validateOnboardingRequest(payload) {
  const errors = [];

  for (const key of REQUIRED_TOP_LEVEL) {
    if (!(key in payload)) {
      errors.push(`Campo obrigatorio ausente: ${key}`);
    }
  }

  if (payload.operational_mode && !["demo", "production"].includes(payload.operational_mode)) {
    errors.push("operational_mode deve ser demo ou production");
  }

  if (!payload.channels || typeof payload.channels !== "object") {
    errors.push("channels deve ser objeto");
  } else {
    for (const channelKey of ["site_sdr_enabled", "form_enabled", "whatsapp_enabled"]) {
      if (typeof payload.channels[channelKey] !== "boolean") {
        errors.push(`channels.${channelKey} deve ser boolean`);
      }
    }
  }

  if (!payload.brand || typeof payload.brand !== "object") {
    errors.push("brand deve ser objeto");
  } else {
    for (const brandKey of ["name", "headline", "primary_cta"]) {
      if (!String(payload.brand[brandKey] || "").trim()) {
        errors.push(`brand.${brandKey} e obrigatorio`);
      }
    }
  }

  if (!Array.isArray(payload.offers) || payload.offers.length === 0) {
    errors.push("offers deve ser array com pelo menos 1 item");
  }

  if (!Array.isArray(payload.faq) || payload.faq.length === 0) {
    errors.push("faq deve ser array com pelo menos 1 item");
  }

  for (const strField of ["client_slug", "segment", "site_domain", "vercel_project_name"]) {
    if (!String(payload[strField] || "").trim()) {
      errors.push(`${strField} deve ser string nao vazia`);
    }
  }

  if (typeof payload.uses_whatsbot !== "boolean") {
    errors.push("uses_whatsbot deve ser boolean");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

