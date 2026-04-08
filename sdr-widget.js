(function initSdrWidget() {
  const STORAGE_VISITOR_ID = "codestech_sdr_visitor_id";
  const STORAGE_CONVERSATION_ID = "codestech_sdr_conversation_id";
  const STORAGE_STATE_SNAPSHOT = "codestech_sdr_state_snapshot";
  const ORIGIN_LABEL = "site_widget_projetointegracaosite";

  const routeContextMap = {
    "/": { product_focus: "geral", page_type: "homepage", serviceId: null },
    "/home": { product_focus: "geral", page_type: "homepage", serviceId: null },
    "/inicio": { product_focus: "geral", page_type: "homepage", serviceId: null },
    "/servicos": { product_focus: "geral", page_type: "services", serviceId: null },
    "/contato": { product_focus: "geral", page_type: "contact", serviceId: null }
  };

  const state = {
    isOpen: false,
    isLoading: false,
    chatClosed: false,
    apiBaseUrl: null,
    apiReady: false,
    messages: []
  };

  const ui = buildUi();
  wireEvents(ui);
  void bootstrapApiConfig(ui);

  function buildUi() {
    const button = document.createElement("button");
    button.id = "sdr-widget-button";
    button.type = "button";
    button.textContent = "Chat de Atendimento";

    const panel = document.createElement("section");
    panel.id = "sdr-widget-panel";
    panel.setAttribute("data-open", "false");

    panel.innerHTML = [
      '<header id="sdr-widget-header">',
      "Chat de Atendimento",
      '<p id="sdr-widget-focus">Foco atual: consultivo_geral</p>',
      "</header>",
      '<div id="sdr-widget-messages"></div>',
      '<footer id="sdr-widget-footer">',
      '<form id="sdr-widget-form">',
      '<input id="sdr-widget-input" type="text" placeholder="Ex: Quero integrar com CRM e WhatsApp" autocomplete="off" />',
      '<button id="sdr-widget-submit" type="submit">Enviar</button>',
      "</form>",
      '<p id="sdr-widget-status"></p>',
      '<div id="sdr-widget-meta" data-closed="false">',
      '<span id="sdr-widget-closed-text">Solicitacao enviada com sucesso.</span>',
      '<button id="sdr-widget-reset" type="button">Nova conversa</button>',
      "</div>",
      "</footer>"
    ].join("");

    document.body.appendChild(button);
    document.body.appendChild(panel);

    return {
      button,
      panel,
      focus: panel.querySelector("#sdr-widget-focus"),
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
      elements.button.textContent = state.isOpen ? "Fechar Chat" : "Chat de Atendimento";

      updateFocusText(elements.focus);

      if (state.isOpen && state.messages.length === 0) {
        void sendMessage("Ola, preciso entender qual solucao faz sentido para mim.", elements);
      }
    });

    elements.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (state.chatClosed || state.isLoading) {
        return;
      }
      const text = String(elements.input.value || "").trim();
      elements.input.value = "";
      if (!text) {
        return;
      }
      await sendMessage(text, elements);
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
      void sendMessage("Ola, preciso entender qual solucao faz sentido para mim.", elements);
    });
  }

  async function bootstrapApiConfig(elements) {
    const configured = await resolveApiBaseUrl();
    state.apiBaseUrl = configured;
    state.apiReady = Boolean(configured);

    if (!state.apiReady) {
      elements.status.textContent = "Widget ativo, mas sem SDR_API_BASE_URL configurada.";
      elements.submit.disabled = true;
      elements.input.disabled = true;
    }
  }

  async function resolveApiBaseUrl() {
    const inlineConfig = window.__SDR_WIDGET_CONFIG__ && window.__SDR_WIDGET_CONFIG__.apiBaseUrl;
    if (typeof inlineConfig === "string" && inlineConfig.trim()) {
      return inlineConfig.trim().replace(/\/+$/, "");
    }

    const metaValue = document.querySelector('meta[name="sdr-api-base-url"]')?.getAttribute("content");
    if (typeof metaValue === "string" && metaValue.trim()) {
      return metaValue.trim().replace(/\/+$/, "");
    }

    try {
      const response = await fetch("/api/sdr-config", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      const apiBaseUrl = String(data && data.apiBaseUrl ? data.apiBaseUrl : "").trim();
      return apiBaseUrl ? apiBaseUrl.replace(/\/+$/, "") : null;
    } catch (_error) {
      return null;
    }
  }

  function getOrCreateId(storageKey, prefix) {
    const current = window.localStorage.getItem(storageKey);
    if (current) {
      return current;
    }
    const generated = prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    window.localStorage.setItem(storageKey, generated);
    return generated;
  }

  function readStateSnapshot() {
    try {
      const raw = window.localStorage.getItem(STORAGE_STATE_SNAPSHOT);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_error) {
      return null;
    }
  }

  function writeStateSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_STATE_SNAPSHOT, JSON.stringify(snapshot));
    } catch (_error) {
      // Ignore localStorage transient failures.
    }
  }

  function resolvePageContext(pathname) {
    const normalizedPath = String(pathname || "/").toLowerCase();
    return routeContextMap[normalizedPath] || {
      product_focus: "geral",
      page_type: "unknown",
      serviceId: null
    };
  }

  function collectTrackingContext() {
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

  function setLoading(elements, loading) {
    state.isLoading = loading;
    elements.submit.disabled = loading || state.chatClosed || !elements.input.value.trim();
    elements.input.disabled = loading || state.chatClosed || !state.apiReady;
    elements.status.textContent = loading ? "Atendimento digitando..." : "";
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
    hint.textContent = "Escreva sua duvida comercial e eu te ajudo a escolher a melhor solucao para o seu caso.";
    container.appendChild(hint);
  }

  function updateFocusText(node) {
    const ctx = resolvePageContext(window.location.pathname);
    node.textContent = "Foco atual: " + (ctx.product_focus || "consultivo_geral");
  }

  async function sendMessage(text, elements) {
    const cleanText = String(text || "").trim();
    if (!cleanText) {
      return;
    }

    if (!state.apiReady || !state.apiBaseUrl) {
      appendMessage("assistant", "Configuracao ausente: defina SDR_API_BASE_URL na Vercel ou window.__SDR_WIDGET_CONFIG__.apiBaseUrl.", elements);
      return;
    }

    if (state.messages.length === 0) {
      renderHint(elements.messages);
    }

    const visitorId = getOrCreateId(STORAGE_VISITOR_ID, "visitor");
    const conversationId = getOrCreateId(STORAGE_CONVERSATION_ID, "conv");
    const stateSnapshot = readStateSnapshot();
    const pageContext = resolvePageContext(window.location.pathname);
    const tracking = collectTrackingContext();

    appendMessage("user", cleanText, elements);
    setLoading(elements, true);

    try {
      const payload = {
        conversation_id: conversationId,
        visitor_id: visitorId,
        message: cleanText,
        page_url: tracking.current_url || window.location.href,
        page_slug: tracking.page_path || window.location.pathname,
        page_type: pageContext.page_type,
        serviceId: pageContext.serviceId,
        product_focus: pageContext.product_focus,
        origin: ORIGIN_LABEL,
        state_snapshot: stateSnapshot,
        device_type: window.innerWidth < 768 ? "mobile" : "desktop",
        site_origin: tracking.site_origin,
        current_url: tracking.current_url,
        page_path: tracking.page_path,
        referrer: tracking.referrer,
        utm_source: tracking.utm_source,
        utm_medium: tracking.utm_medium,
        utm_campaign: tracking.utm_campaign,
        utm_content: tracking.utm_content,
        utm_term: tracking.utm_term
      };

      const response = await fetch(state.apiBaseUrl + "/sdr/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      const data = await response.json();
      writeStateSnapshot(data.state);

      const shouldClose = Boolean(data.chat_closed || data.handoff_dispatched);
      state.chatClosed = shouldClose;
      elements.meta.setAttribute("data-closed", shouldClose ? "true" : "false");

      const replyText = shouldClose
        ? data.widget_message || "Perfeito. Seu pedido foi enviado com prioridade.\nVamos seguir o atendimento pelo e-mail e WhatsApp informados.\nSe quiser, voce pode iniciar uma nova conversa por aqui."
        : data.widget_message || data.reply_text || "Posso te ajudar com mais contexto comercial.";

      appendMessage("assistant", replyText, elements);
      elements.input.disabled = shouldClose;
      elements.submit.disabled = shouldClose;
    } catch (error) {
      appendMessage("assistant", "Nao consegui processar agora. Posso tentar novamente em alguns segundos?", elements);
      console.error("[chat_atendimento] erro de envio", error);
    } finally {
      setLoading(elements, false);
    }
  }
})();
