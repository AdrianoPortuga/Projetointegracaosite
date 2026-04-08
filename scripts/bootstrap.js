import { loadSiteConfig } from "../config/loader.js";
import { applyBrandingTokens } from "../utils/branding/applyBranding.js";
import { renderLanding } from "../components/landing/renderLanding.js";
import { renderLeadForm } from "../components/forms/renderLeadForm.js";
import { initSdrWidget } from "../components/sdr/initSdrWidget.js";

async function bootstrap() {
  try {
    const config = await loadSiteConfig();
    applyBrandingTokens(config);
    renderLanding(config);
    renderLeadForm(config);
    initSdrWidget(config);
    document.body.setAttribute("data-client-slug", String(config.client_slug || ""));
    document.body.setAttribute("data-segment", String(config.segment || ""));
    document.body.setAttribute("data-demo-mode", String(Boolean(config.demo_mode)));
    window.__SITE_TEMPLATE_READY__ = true;
  } catch (error) {
    console.error("[site_template] bootstrap error", error);
    document.body.insertAdjacentHTML(
      "afterbegin",
      "<p style='padding:12px;background:#fee2e2;color:#7f1d1d'>Falha ao carregar configuração do cliente.</p>"
    );
  }
}

void bootstrap();
