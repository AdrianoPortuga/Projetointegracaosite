import { collectTrackingContext } from "../../utils/tracking/context.js";

export function renderLeadForm(config) {
  const container = document.getElementById("lead-form-container");
  if (!container) return;

  if (!config?.channels?.form_enabled) {
    container.innerHTML = "<p>Canal de formulário desativado para este cliente.</p>";
    return;
  }

  const collectFields = Array.isArray(config?.sdr?.collect_fields) ? config.sdr.collect_fields : [];
  const includePhone = collectFields.includes("telefone");

  container.innerHTML = `
    <form class="lead-form" id="lead-form">
      <h2>Solicite atendimento</h2>
      <small>Este form é template base. Conecte o submit ao endpoint final de leads conforme cliente.</small>
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
    const payload = Object.fromEntries(data.entries());
    status.textContent = "Form capturado localmente. Conecte aqui o endpoint de lead quando for publicar.";
    console.info("[lead_form_template]", {
      payload,
      tracking: collectTrackingContext(),
      client_slug: config.client_slug,
      segment: config.segment
    });
  });
}
