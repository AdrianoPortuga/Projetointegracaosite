export function renderLanding(config) {
  const brand = config?.brand || {};
  const offers = Array.isArray(config?.offers) ? config.offers : [];
  const faq = Array.isArray(config?.faq) ? config.faq : [];

  setText("brand-name", brand.name || "Codestech");
  setText("brand-headline", brand.headline || "Template comercial plug-and-play");
  setText("brand-description", brand.description || "Base escalável para SDR e handoff.");

  const cta = document.getElementById("primary-cta");
  if (cta) {
    cta.textContent = brand.primary_cta || "Quero atendimento";
    cta.setAttribute("href", brand.primary_cta_href || "#lead-form-container");
  }

  renderList("offers-list", offers, (offer) => {
    const title = escapeHtml(offer.title || "");
    const description = escapeHtml(offer.description || "");
    return `<strong>${title}</strong>${description ? ` - ${description}` : ""}`;
  });

  renderList("faq-list", faq, (item) => {
    const question = escapeHtml(item.question || "");
    const answer = escapeHtml(item.answer || "");
    return `<strong>${question}</strong>${answer ? `<br>${answer}` : ""}`;
  });
}

function setText(id, text) {
  const node = document.getElementById(id);
  if (node) node.textContent = text;
}

function renderList(id, data, toHtml) {
  const list = document.getElementById(id);
  if (!list) return;
  list.innerHTML = "";
  for (const item of data) {
    const li = document.createElement("li");
    li.innerHTML = toHtml(item);
    list.appendChild(li);
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
