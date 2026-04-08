import { buildSdrPayload } from "../../utils/lead/sdrPayload.js";

const STORAGE_VISITOR_ID = "codestech_sdr_visitor_id";
const STORAGE_CONVERSATION_ID = "codestech_sdr_conversation_id";
const STORAGE_STATE_SNAPSHOT = "codestech_sdr_state_snapshot";

export function initSdrWidget(config) {
  if (!config?.channels?.site_sdr_enabled) {
    return;
  }

  const sdrConfig = config.sdr || {};
  const state = {
    isOpen: false,
    isLoading: false,
    chatClosed: false,
    apiBaseUrl: (window.__SDR_WIDGET_CONFIG__?.apiBaseUrl || "").replace(/\/+$/, ""),
    apiReady: Boolean(window.__SDR_WIDGET_CONFIG__?.apiBaseUrl),
    messages: []
  };

  const ui = buildUi(config);
  wireEvents(ui);

  if (!state.apiReady) {
    ui.status.textContent = "Widget ativo, mas sem SDR_API_BASE_URL configurada.";
    ui.submit.disabled = true;
    ui.input.disabled = true;
  }

  function buildUi(siteConfig) {
    const button = document.createElement("button");
    button.id = "sdr-widget-button";
    button.type = "button";
    button.textContent = siteConfig?.sdr?.button_label || "Chat SDR";

    const panel = document.createElement("section");
    panel.id = "sdr-widget-panel";
    panel.setAttribute("data-open", "false");

    const title = siteConfig?.sdr?.chat_title || "SDR Virtual";
    const focus = sdrConfig.goal || "qualificacao_comercial";
    const modeTag = siteConfig?.demo_mode ? " [DEMO]" : "";
    const placeholder = siteConfig?.sdr?.input_placeholder || "Digite sua necessidade comercial";
    const sendLabel = siteConfig?.sdr?.send_button_label || "Enviar";
    const closeLabel = siteConfig?.sdr?.new_chat_button_label || "Nova conversa";

    panel.innerHTML = [
      '<header id="sdr-widget-header">',
      `${title}${modeTag}`,
      `<p id="sdr-widget-focus">Foco atual: ${focus}</p>`,
      "</header>",
      '<div id="sdr-widget-messages"></div>',
      '<footer id="sdr-widget-footer">',
      '<form id="sdr-widget-form">',
      `<input id="sdr-widget-input" type="text" placeholder="${escapeHtml(placeholder)}" autocomplete="off" />`,
      `<button id="sdr-widget-submit" type="submit">${escapeHtml(sendLabel)}</button>`,
      "</form>",
      '<p id="sdr-widget-status"></p>',
      '<div id="sdr-widget-meta" data-closed="false">',
      `<span id="sdr-widget-closed-text">${escapeHtml(siteConfig?.sdr?.handoff_done_message || "Solicitacao enviada com sucesso.")}</span>`,
      `<button id="sdr-widget-reset" type="button">${escapeHtml(closeLabel)}</button>`,
      "</div>",
      "</footer>"
    ].join("");

    document.body.appendChild(button);
    document.body.appendChild(panel);

    return {
      button,
      panel,
      messages: panel.querySelector("#sdr-widget-messages"),
      form: panel.querySelector("#sdr-widget-form"),
      input: panel.querySelector("#sdr-widget-input"),
      submit: panel.querySelector("#sdr-widget-submit"),
      status: panel.querySelector("#sdr-widget-status"),
      meta: panel.querySelector("#sdr-widget-meta"),
      reset: panel.querySelector("#sdr-widget-reset")
    };
  }

  function wireEvents(elements) {
    elements.button.addEventListener("click", () => {
      state.isOpen = !state.isOpen;
      elements.panel.setAttribute("data-open", state.isOpen ? "true" : "false");
      elements.button.textContent = state.isOpen
        ? config?.sdr?.close_button_label || "Fechar Chat"
        : config?.sdr?.button_label || "Chat SDR";

      if (state.isOpen && state.messages.length === 0) {
        const opening = config?.sdr?.opening_message || "Ola, posso te ajudar com sua necessidade comercial.";
        void sendMessage(opening, elements, true);
      }
    });

    elements.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (state.chatClosed || state.isLoading) return;
      const text = String(elements.input.value || "").trim();
      elements.input.value = "";
      elements.submit.disabled = true;
      if (!text) return;
      await sendMessage(text, elements, false);
    });

    elements.input.addEventListener("input", () => {
      elements.submit.disabled = state.isLoading || state.chatClosed || !elements.input.value.trim();
    });

    elements.reset.addEventListener("click", () => {
      window.localStorage.removeItem(STORAGE_CONVERSATION_ID);
      window.localStorage.removeItem(STORAGE_STATE_SNAPSHOT);
      state.messages = [];
      state.chatClosed = false;
      elements.meta.setAttribute("data-closed", "false");
      elements.messages.innerHTML = "";
      renderHint(elements.messages);
      elements.input.disabled = !state.apiReady;
      elements.submit.disabled = true;
    });
  }

  async function sendMessage(text, elements, isSystemMessage) {
    const cleanText = String(text || "").trim();
    if (!cleanText) return;

    if (!state.apiReady || !state.apiBaseUrl) {
      appendMessage("assistant", "Configuracao ausente: defina SDR_API_BASE_URL na Vercel.", elements);
      return;
    }

    if (state.messages.length === 0) {
      renderHint(elements.messages);
    }

    const visitorId = getOrCreateId(STORAGE_VISITOR_ID, "visitor");
    const conversationId = getOrCreateId(STORAGE_CONVERSATION_ID, "conv");
    const stateSnapshot = readStateSnapshot();
    const payload = buildSdrPayload({
      message: cleanText,
      conversationId,
      visitorId,
      stateSnapshot,
      config
    });

    if (!isSystemMessage) {
      appendMessage("user", cleanText, elements);
    }
    setLoading(elements, true);

    try {
      const response = await fetch(`${state.apiBaseUrl}/sdr/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      writeStateSnapshot(data.state);

      const shouldClose = Boolean(data.chat_closed || data.handoff_dispatched);
      state.chatClosed = shouldClose;
      elements.meta.setAttribute("data-closed", shouldClose ? "true" : "false");

      const defaultHandoffMessage =
        config?.sdr?.handoff_response ||
        "Perfeito. Seu pedido foi enviado com prioridade.\nNosso time continua o atendimento pelos canais informados.";
      const defaultReply = config?.sdr?.fallback_reply || "Posso te ajudar com mais contexto comercial.";
      const replyText = shouldClose
        ? data.widget_message || defaultHandoffMessage
        : data.widget_message || data.reply_text || defaultReply;

      appendMessage("assistant", replyText, elements);
      elements.input.disabled = shouldClose;
      elements.submit.disabled = shouldClose;
    } catch (error) {
      appendMessage(
        "assistant",
        config?.sdr?.error_message || "Nao consegui processar agora. Posso tentar novamente em alguns segundos?",
        elements
      );
      console.error("[sdr_widget_template] erro", error);
    } finally {
      setLoading(elements, false);
    }
  }

  function appendMessage(role, text, elements) {
    state.messages.push({ role, text });
    const node = document.createElement("article");
    node.className = "sdr-message" + (role === "user" ? " user" : "");
    node.textContent = text;
    elements.messages.appendChild(node);
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function renderHint(container) {
    const hint = document.createElement("article");
    hint.className = "sdr-message";
    hint.textContent = config?.sdr?.hint_message || "Descreva seu contexto e eu monto o melhor próximo passo.";
    container.appendChild(hint);
  }

  function setLoading(elements, loading) {
    state.isLoading = loading;
    elements.input.disabled = loading || state.chatClosed || !state.apiReady;
    elements.submit.disabled = loading || state.chatClosed || !elements.input.value.trim();
    elements.status.textContent = loading ? config?.sdr?.typing_message || "Atendimento digitando..." : "";
  }
}

function getOrCreateId(storageKey, prefix) {
  const current = window.localStorage.getItem(storageKey);
  if (current) return current;
  const generated = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(storageKey, generated);
  return generated;
}

function readStateSnapshot() {
  try {
    const raw = window.localStorage.getItem(STORAGE_STATE_SNAPSHOT);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeStateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return;
  try {
    window.localStorage.setItem(STORAGE_STATE_SNAPSHOT, JSON.stringify(snapshot));
  } catch {
    // ignore storage errors
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
