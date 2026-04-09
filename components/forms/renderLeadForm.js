import { collectTrackingContext } from "../../utils/tracking/context.js";
import { buildFormPayload } from "../../utils/lead/formPayload.js";

export function renderLeadForm(config) {
  const container = document.getElementById("lead-form-container");
  if (!container) return;

  if (!config?.channels?.form_enabled) {
    container.innerHTML = "<p>Canal de formulario desativado para este cliente.</p>";
    return;
  }

  const formFields = resolveFormFields(config);

  container.innerHTML = `
    <form class="lead-form" id="lead-form">
      <h2>Solicite atendimento</h2>
      <small>${
        config?.demo_mode
          ? "Modo DEMO ativo: envio real desativado por padrao."
          : "Formulario conectado via configuracao de lead routing."
      }</small>
      <div class="lead-form-grid">
        ${formFields.map((field) => renderField(field)).join("")}
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
    const localApiBaseUrl = window.__SITE_RUNTIME_CONFIG__?.localApiBaseUrl || "/api";
    const endpointPath = config?.lead_routing?.form_endpoint_path || "/api/lead/codesagency";
    const proxyPath = resolveProxyPath(localApiBaseUrl, endpointPath);
    const blockLiveSubmit = Boolean(config?.demo_mode && config?.lead_routing?.demo_allow_live_submit !== true);

    if (blockLiveSubmit) {
      status.textContent = "Lead marcado como DEMO. Sem envio real nesta configuracao.";
      console.info("[lead_form_template_local]", {
        payload,
        tracking: collectTrackingContext(),
        client_slug: config.client_slug,
        segment: config.segment,
        demo_mode: config.demo_mode
      });
      return;
    }

    fetch(proxyPath, {
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

function renderField(field) {
  const isTextarea = field.type === "textarea";
  const className = field.fullWidth ? " class=\"lead-form-grid-full\"" : "";
  const requiredAttr = field.required ? " required" : "";
  const placeholder = field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : "";
  const label = escapeHtml(field.label);
  const name = escapeHtml(field.name);
  const type = escapeHtml(field.type || "text");

  if (isTextarea) {
    return `<label${className}>${label}<textarea name="${name}" rows="4"${requiredAttr}${placeholder}></textarea></label>`;
  }

  return `<label${className}>${label}<input type="${type}" name="${name}"${requiredAttr}${placeholder} /></label>`;
}

function resolveFormFields(config) {
  const explicit = Array.isArray(config?.form?.fields) ? config.form.fields : [];
  if (explicit.length) {
    return explicit.map((field) => ({
      name: field.name,
      label: field.label || toLabel(field.name),
      type: field.type || "text",
      required: Boolean(field.required),
      placeholder: field.placeholder || "",
      fullWidth: field.type === "textarea"
    }));
  }

  const collectFields = Array.isArray(config?.sdr?.collect_fields) ? config.sdr.collect_fields : [];
  const includes = new Set(collectFields);
  const base = [
    { name: "nome", label: "Nome", type: "text", required: true, placeholder: "" },
    { name: "email", label: "E-mail", type: "email", required: true, placeholder: "" }
  ];

  if (includes.has("telefone")) {
    base.push({ name: "telefone", label: "Telefone", type: "tel", required: false, placeholder: "" });
  }

  for (const field of collectFields) {
    if (["nome", "email", "telefone", "mensagem"].includes(field)) continue;
    base.push({
      name: field,
      label: toLabel(field),
      type: "text",
      required: false,
      placeholder: ""
    });
  }

  base.push({ name: "mensagem", label: "Mensagem", type: "textarea", required: false, placeholder: "", fullWidth: true });
  return base;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function resolveProxyPath(localApiBase, configuredPath) {
  const base = String(localApiBase || "/api").replace(/\/+$/, "");
  const path = String(configuredPath || "").trim();

  if (!path) return `${base}/lead/codesagency`;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/api/")) return path;
  if (path.startsWith("/")) return `${base}${path}`;
  return `${base}/${path}`;
}
