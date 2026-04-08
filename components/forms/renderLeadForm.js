import { collectTrackingContext } from "../../utils/tracking/context.js";
import { buildFormPayload } from "../../utils/lead/formPayload.js";

export function renderLeadForm(config) {
  const container = document.getElementById("lead-form-container");
  if (!container) return;

  if (!config?.channels?.form_enabled) {
    container.innerHTML = "<p>Canal de formulário desativado para este cliente.</p>";
    return;
  }

  const collectFields = Array.isArray(config?.sdr?.collect_fields) ? config.sdr.collect_fields : [];
  const includePhone = collectFields.includes("telefone");
  const dynamicFields = collectFields.filter(
    (field) => !["nome", "email", "telefone", "mensagem"].includes(field)
  );

  container.innerHTML = `
    <form class="lead-form" id="lead-form">
      <h2>Solicite atendimento</h2>
      <small>${
        config?.demo_mode
          ? "Modo DEMO ativo: envio real desativado por padrão."
          : "Formulário conectado via configuração de lead routing."
      }</small>
      <div class="lead-form-grid">
        <label>
          Nome
          <input type="text" name="nome" required />
        </label>
        <label>
          E-mail
          <input type="email" name="email" required />
        </label>
        ${
          includePhone
            ? `<label>
                Telefone
                <input type="tel" name="telefone" />
              </label>`
            : ""
        }
        ${dynamicFields
          .map(
            (field) => `<label>
              ${toLabel(field)}
              <input type="text" name="${field}" />
            </label>`
          )
          .join("")}
        <label class="lead-form-grid-full">
          Mensagem
          <textarea name="mensagem" rows="4"></textarea>
        </label>
      </div>
      <button type="submit">${config?.brand?.primary_cta || "Enviar"}</button>
      <small id="lead-form-status"></small>
    </form>
  `;

  const form = document.getElementById("lead-form");
  const status = document.getElementById("lead-form-status");
  if (!form || !status) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const rawForm = Object.fromEntries(data.entries());
    const payload = buildFormPayload({ formData: rawForm, config });
    const runtimeApiBaseUrl = window.__SITE_RUNTIME_CONFIG__?.apiBaseUrl || null;
    const endpointPath = config?.lead_routing?.form_endpoint_path || "/leads/codesagency";
    const blockLiveSubmit = Boolean(config?.demo_mode && config?.lead_routing?.demo_allow_live_submit !== true);

    if (!runtimeApiBaseUrl || blockLiveSubmit) {
      status.textContent = blockLiveSubmit
        ? "Lead marcado como DEMO. Sem envio real nesta configuração."
        : "Sem SDR_API_BASE_URL para envio real.";
      console.info("[lead_form_template_local]", {
        payload,
        tracking: collectTrackingContext(),
        client_slug: config.client_slug,
        segment: config.segment,
        demo_mode: config.demo_mode
      });
      return;
    }

    fetch(`${String(runtimeApiBaseUrl).replace(/\/+$/, "")}${endpointPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        status.textContent = "Lead enviado com sucesso.";
      })
      .catch((error) => {
        status.textContent = "Falha no envio do lead. Verifique a rota configurada.";
        console.error("[lead_form_template_submit] erro", error);
      });
  });
}

function toLabel(field) {
  return String(field || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
