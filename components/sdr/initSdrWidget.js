import { buildSdrPayload } from "../../utils/lead/sdrPayload.js";
import { buildNamespace } from "../../utils/lead/namespace.js";

const DEFAULT_URGENCY_OPTIONS = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" }
];

const LEGAL_SENSITIVE_TERMS = ["violencia", "abuso", "agressao", "deport", "expuls", "despejo", "amea", "urgente"];
const AZURE_SPEECH_SDK_URL =
  "https://cdn.jsdelivr.net/npm/microsoft-cognitiveservices-speech-sdk@latest/distrib/browser/microsoft.cognitiveservices.speech.sdk.bundle-min.js";

let speechSdkPromise = null;

export function initSdrWidget(config) {
  if (!config?.channels?.site_sdr_enabled) {
    return;
  }

  const routingConfig = config.lead_routing || {};
  const panelCopy = resolvePanelCopy(config);
  const namespace = buildNamespace(config, "site_sdr");
  const STORAGE_VISITOR_ID = `${namespace}:visitor_id`;
  const STORAGE_CONVERSATION_ID = `${namespace}:conversation_id`;
  const STORAGE_STATE_SNAPSHOT = `${namespace}:state_snapshot`;

  const state = {
    isOpen: false,
    isLoading: false,
    chatClosed: false,
    apiBaseUrl: (window.__SDR_WIDGET_CONFIG__?.apiBaseUrl || "/api").replace(/\/+$/, ""),
    apiReady: true,
    messages: [],
    voice: {
      listening: false,
      speaking: false,
      recognizer: null,
      currentAudio: null
    },
    caseData: {
      nome: "",
      contacto: "",
      classification: panelCopy.classificationOptions[0]?.value || "outro",
      urgencia: "media",
      canal: "texto"
    }
  };

  const ui = buildUi(config, panelCopy);
  wireEvents(ui);
  updateStructuredPreview(ui);

  if (!state.apiReady) {
    ui.status.textContent = "Widget ativo, mas proxy local indisponivel.";
    ui.submit.disabled = true;
    ui.input.disabled = true;
  }

  function buildUi(siteConfig, copy) {
    const button = document.createElement("button");
    button.id = "sdr-widget-button";
    button.type = "button";
    button.textContent = siteConfig?.sdr?.button_label || "Chat SDR";

    const panel = document.createElement("section");
    panel.id = "sdr-widget-panel";
    panel.setAttribute("data-open", "false");

    const title = copy.title;
    const modeTag = siteConfig?.demo_mode ? " [DEMO]" : "";
    const closeLabel = siteConfig?.sdr?.new_chat_button_label || "Nova conversa";

    panel.innerHTML = [
      '<header id="sdr-widget-header">',
      `<div><span class="sdr-kicker">${escapeHtml(copy.badge)}</span><h2>${escapeHtml(title)}${modeTag}</h2><p>${escapeHtml(copy.subtitle)}</p></div>`,
      "</header>",
      '<div id="sdr-widget-shell">',
      '<section id="sdr-widget-left">',
      `<article class="sdr-assistant-card"><span class="sdr-mini-label">Dora</span><strong>${escapeHtml(copy.assistantTitle)}</strong><p>${escapeHtml(copy.openingMessage)}</p></article>`,
      '<div class="sdr-action-group">',
      `<button id="sdr-widget-mic" type="button">${escapeHtml(copy.primaryMicLabel)}</button>`,
      `<button id="sdr-widget-write" type="button">${escapeHtml(copy.alternateTextLabel)}</button>`,
      "</div>",
      `<article class="sdr-status-card"><span class="sdr-mini-label">${escapeHtml(copy.statusTitle)}</span><strong id="sdr-widget-status-label">Pronto</strong><p id="sdr-widget-channel-label">${escapeHtml(copy.channelActiveLabel)}: Texto</p><p id="sdr-widget-status"></p></article>`,
      `<button id="sdr-widget-tts" type="button">${escapeHtml(copy.listenReplyLabel)}</button>`,
      '<section class="sdr-structured-card">',
      `<span class="sdr-mini-label">${escapeHtml(copy.handoffSectionTitle)}</span>`,
      `<label>${escapeHtml(copy.nameLabel)}<input id="sdr-widget-name" type="text" placeholder="${escapeHtml(copy.namePlaceholder)}" /></label>`,
      `<label>${escapeHtml(copy.contactLabel)}<input id="sdr-widget-contact" type="text" placeholder="${escapeHtml(copy.contactPlaceholder)}" /></label>`,
      `<label>${escapeHtml(copy.classificationLabel)}<select id="sdr-widget-classification">${copy.classificationOptions
        .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
        .join("")}</select></label>`,
      `<label>${escapeHtml(copy.urgencyLabel)}<select id="sdr-widget-urgency">${DEFAULT_URGENCY_OPTIONS.map(
        (option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`
      ).join("")}</select></label>`,
      "</section>",
      `<div id="sdr-widget-meta" data-closed="false"><span id="sdr-widget-closed-text">${escapeHtml(copy.closedMessage)}</span><button id="sdr-widget-reset" type="button">${escapeHtml(closeLabel)}</button></div>`,
      "</section>",
      '<section id="sdr-widget-right">',
      '<div id="sdr-widget-messages"></div>',
      '<div id="sdr-widget-composer">',
      `<label for="sdr-widget-input">${escapeHtml(copy.inputLabel)}</label>`,
      `<textarea id="sdr-widget-input" rows="4" placeholder="${escapeHtml(copy.inputPlaceholder)}"></textarea>`,
      '<div class="sdr-composer-actions">',
      `<button id="sdr-widget-submit" type="button">${escapeHtml(copy.sendLabel)}</button>`,
      `<button id="sdr-widget-confirm" type="button">${escapeHtml(copy.confirmLabel)}</button>`,
      "</div>",
      "</div>",
      '<div class="sdr-preview-grid">',
      `<article class="sdr-preview-card"><span class="sdr-mini-label">${escapeHtml(copy.summaryTitle)}</span><pre id="sdr-widget-summary">Ainda nao gerado.</pre></article>`,
      `<article class="sdr-preview-card"><span class="sdr-mini-label">${escapeHtml(copy.payloadTitle)}</span><pre id="sdr-widget-payload">Aguardando confirmacao de envio.</pre></article>`,
      "</div>",
      "</section>",
      "</div>"
    ].join("");

    document.body.appendChild(button);
    document.body.appendChild(panel);

    return {
      button,
      panel,
      copy,
      messages: panel.querySelector("#sdr-widget-messages"),
      input: panel.querySelector("#sdr-widget-input"),
      submit: panel.querySelector("#sdr-widget-submit"),
      confirm: panel.querySelector("#sdr-widget-confirm"),
      status: panel.querySelector("#sdr-widget-status"),
      statusLabel: panel.querySelector("#sdr-widget-status-label"),
      channelLabel: panel.querySelector("#sdr-widget-channel-label"),
      summary: panel.querySelector("#sdr-widget-summary"),
      payload: panel.querySelector("#sdr-widget-payload"),
      meta: panel.querySelector("#sdr-widget-meta"),
      reset: panel.querySelector("#sdr-widget-reset"),
      mic: panel.querySelector("#sdr-widget-mic"),
      write: panel.querySelector("#sdr-widget-write"),
      tts: panel.querySelector("#sdr-widget-tts"),
      name: panel.querySelector("#sdr-widget-name"),
      contact: panel.querySelector("#sdr-widget-contact"),
      classification: panel.querySelector("#sdr-widget-classification"),
      urgency: panel.querySelector("#sdr-widget-urgency")
    };
  }

  function wireEvents(elements) {
    elements.button.addEventListener("click", () => {
      state.isOpen = !state.isOpen;
      elements.panel.setAttribute("data-open", state.isOpen ? "true" : "false");
      elements.button.textContent = state.isOpen
        ? config?.sdr?.close_button_label || "Fechar painel"
        : config?.sdr?.button_label || "Chat SDR";

      if (state.isOpen && state.messages.length === 0) {
        appendMessage("assistant", panelCopy.openingMessage, elements, "system");
      }
    });

    elements.submit.addEventListener("click", async () => {
      if (state.chatClosed || state.isLoading) return;
      const text = String(elements.input.value || "").trim();
      if (!text) return;
      elements.input.value = "";
      await sendMessage(text, elements, "typed");
    });

    elements.confirm.addEventListener("click", () => {
      updateStructuredPreview(elements, true);
      appendMessage("system", panelCopy.payloadReadyMessage, elements, "system");
    });

    elements.input.addEventListener("input", () => {
      elements.submit.disabled = state.isLoading || state.chatClosed || !elements.input.value.trim();
    });

    elements.mic.addEventListener("click", async () => {
      if (state.voice.listening || state.isLoading || state.chatClosed) return;
      await startVoiceRecognition(elements);
    });

    elements.write.addEventListener("click", () => {
      stopCurrentAudio();
      stopVoiceRecognition();
      state.caseData.canal = "texto";
      updateStatus(elements, "idle", "");
      updateStructuredPreview(elements);
    });

    elements.tts.addEventListener("click", async () => {
      await playLastAssistantMessage(elements);
    });

    elements.reset.addEventListener("click", () => {
      stopCurrentAudio();
      stopVoiceRecognition();
      window.localStorage.removeItem(STORAGE_CONVERSATION_ID);
      window.localStorage.removeItem(STORAGE_STATE_SNAPSHOT);
      state.messages = [];
      state.chatClosed = false;
      state.caseData = {
        nome: "",
        contacto: "",
        classification: panelCopy.classificationOptions[0]?.value || "outro",
        urgencia: "media",
        canal: "texto"
      };
      elements.meta.setAttribute("data-closed", "false");
      elements.messages.innerHTML = "";
      elements.input.disabled = !state.apiReady;
      elements.submit.disabled = true;
      elements.name.value = "";
      elements.contact.value = "";
      elements.classification.value = state.caseData.classification;
      elements.urgency.value = state.caseData.urgencia;
      updateStatus(elements, "idle", "");
      updateStructuredPreview(elements);
    });

    elements.name.addEventListener("input", () => {
      state.caseData.nome = String(elements.name.value || "").trim();
      updateStructuredPreview(elements);
    });
    elements.contact.addEventListener("input", () => {
      state.caseData.contacto = String(elements.contact.value || "").trim();
      updateStructuredPreview(elements);
    });
    elements.classification.addEventListener("change", () => {
      state.caseData.classification = String(elements.classification.value || "").trim();
      updateStructuredPreview(elements);
    });
    elements.urgency.addEventListener("change", () => {
      state.caseData.urgencia = String(elements.urgency.value || "media").trim();
      updateStructuredPreview(elements);
    });
  }

  async function sendMessage(text, elements, source = "typed") {
    const cleanText = String(text || "").trim();
    if (!cleanText) return;

    if (!state.apiReady || !state.apiBaseUrl) {
      appendMessage("assistant", "Proxy local indisponivel no momento.", elements, "system");
      return;
    }

    const visitorId = getOrCreateId(STORAGE_VISITOR_ID, "visitor");
    const conversationId = getOrCreateId(STORAGE_CONVERSATION_ID, "conv");
    const stateSnapshot = readStateSnapshot(STORAGE_STATE_SNAPSHOT);
    const payload = buildSdrPayload({
      message: cleanText,
      conversationId,
      visitorId,
      stateSnapshot,
      config
    });

    appendMessage("user", cleanText, elements, source);

    if (panelCopy.security && hasSensitiveContent(cleanText, panelCopy.security.terms)) {
      appendMessage("assistant", panelCopy.security.phrase, elements, "system");
    }

    updateStatus(elements, "processando", panelCopy.typingMessage);
    setLoading(elements, true);

    try {
      const sdrEndpointPath = routingConfig.sdr_endpoint_path || "/api/sdr/chat";
      const proxyPath = resolveProxyPath(state.apiBaseUrl, sdrEndpointPath);
      const response = await fetch(proxyPath, {
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
      writeStateSnapshot(STORAGE_STATE_SNAPSHOT, data.state);

      const shouldClose = Boolean(data.chat_closed || data.handoff_dispatched);
      state.chatClosed = shouldClose;
      elements.meta.setAttribute("data-closed", shouldClose ? "true" : "false");

      const replyText = shouldClose
        ? data.widget_message || panelCopy.closedMessage
        : data.widget_message || data.reply_text || panelCopy.fallbackReply;

      appendMessage("assistant", replyText, elements, "system");

      const extracted = data?.extracted_fields || {};
      state.caseData.nome = state.caseData.nome || extracted.nome || "";
      state.caseData.contacto = state.caseData.contacto || extracted.telefone || extracted.email || "";
      if (["baixa", "media", "alta"].includes(extracted.urgencia)) {
        state.caseData.urgencia = extracted.urgencia;
      }
      elements.name.value = state.caseData.nome;
      elements.contact.value = state.caseData.contacto;
      elements.urgency.value = state.caseData.urgencia;
      updateStructuredPreview(elements);
      updateStatus(elements, shouldClose ? "respondendo" : "idle", "");
      elements.input.disabled = shouldClose;
      elements.submit.disabled = shouldClose;
    } catch (error) {
      appendMessage("assistant", panelCopy.errorMessage, elements, "system");
      console.error("[sdr_widget_template] erro", error);
      updateStatus(elements, "idle", "");
    } finally {
      setLoading(elements, false);
    }
  }

  async function startVoiceRecognition(elements) {
    state.caseData.canal = "voz_premium";
    updateStructuredPreview(elements);

    try {
      const tokenInfo = await fetchVoiceToken(state.apiBaseUrl);

      if (!window.isSecureContext) {
        throw new Error("secure_context_required");
      }

      const sdk = await loadSpeechSdk();
      const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(tokenInfo.token, tokenInfo.region);
      speechConfig.speechRecognitionLanguage = tokenInfo.recognitionLanguage || panelCopy.voiceRecognitionLanguage;
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      state.voice.listening = true;
      state.voice.recognizer = recognizer;
      updateStatus(elements, "ouvindo", panelCopy.listeningMessage);
      setVoiceBusy(elements, true);

      const result = await new Promise((resolve, reject) => {
        recognizer.recognizeOnceAsync(resolve, reject);
      });

      const recognizedText = normalizeRecognizedText(result?.text);
      if (!recognizedText) {
        appendMessage("system", panelCopy.noSpeechDetectedMessage, elements, "system");
        updateStatus(elements, "idle", panelCopy.noSpeechDetectedMessage);
        return;
      }

      appendMessage("system", panelCopy.transcriptionReadyMessage, elements, "system");
      await sendMessage(recognizedText, elements, "stt");
    } catch (error) {
      const message = resolveVoiceErrorMessage(error, panelCopy.voiceUnavailableMessage);
      appendMessage("system", message, elements, "system");
      updateStatus(elements, "idle", message);
      console.error("[sdr_widget_template] voice_error", error);
    } finally {
      stopVoiceRecognition();
      setVoiceBusy(elements, false);
    }
  }

  async function playLastAssistantMessage(elements) {
    const lastAssistantMessage = [...state.messages].reverse().find((entry) => entry.role === "assistant");
    if (!lastAssistantMessage?.text || state.voice.speaking) return;

    try {
      setVoiceBusy(elements, true);
      updateStatus(elements, "respondendo", panelCopy.speakingMessage);

      const response = await fetch(resolveProxyPath(state.apiBaseUrl, "/voice/tts"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          text: lastAssistantMessage.text,
          voiceName: panelCopy.voiceName,
          language: panelCopy.voiceSynthesisLanguage
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data?.audioBase64) {
        throw new Error("tts_audio_missing");
      }

      stopCurrentAudio();
      const audio = new Audio(`data:${data.contentType || "audio/mpeg"};base64,${data.audioBase64}`);
      state.voice.currentAudio = audio;
      state.voice.speaking = true;
      audio.addEventListener("ended", () => {
        state.voice.speaking = false;
        state.voice.currentAudio = null;
        updateStatus(elements, "idle", "");
        setVoiceBusy(elements, false);
      });
      audio.addEventListener("error", () => {
        state.voice.speaking = false;
        state.voice.currentAudio = null;
        appendMessage("system", panelCopy.ttsErrorMessage, elements, "system");
        updateStatus(elements, "idle", panelCopy.ttsErrorMessage);
        setVoiceBusy(elements, false);
      });
      await audio.play();
    } catch (error) {
      const fallbackPlayed = playBrowserSpeechFallback(lastAssistantMessage.text, panelCopy.voiceSynthesisLanguage);
      const message = fallbackPlayed ? panelCopy.ttsFallbackMessage : panelCopy.ttsErrorMessage;
      appendMessage("system", message, elements, "system");
      updateStatus(elements, "idle", message);
      setVoiceBusy(elements, false);
      console.error("[sdr_widget_template] tts_error", error);
    }
  }

  function appendMessage(role, text, elements, source = role === "user" ? "typed" : "system") {
    state.messages.push({ role, text, timestamp: Date.now(), source });
    const node = document.createElement("article");
    node.className = `sdr-message${role === "user" ? " user" : role === "system" ? " system" : ""}`;
    node.innerHTML = [
      `<header><strong>${escapeHtml(roleLabel(role))}</strong><span>${escapeHtml(sourceLabel(source))}</span></header>`,
      `<p>${escapeHtml(text)}</p>`
    ].join("");
    elements.messages.appendChild(node);
    elements.messages.scrollTop = elements.messages.scrollHeight;
    updateStructuredPreview(elements);
  }

  function updateStatus(elements, status, detail) {
    elements.statusLabel.textContent = statusLabel(status);
    elements.channelLabel.textContent = `${panelCopy.channelActiveLabel}: ${state.caseData.canal === "texto" ? "Texto" : "Voz premium"}`;
    elements.status.textContent = detail || "";
  }

  function updateStructuredPreview(elements, confirmed = false) {
    const summary = buildSummary(panelCopy, state.messages, state.caseData);
    const payload = buildPayload(panelCopy, state.messages, state.caseData, {
      conversationId: getOrCreateId(STORAGE_CONVERSATION_ID, "conv"),
      visitorId: getOrCreateId(STORAGE_VISITOR_ID, "visitor")
    });

    elements.summary.textContent = confirmed || state.messages.length ? summary : "Ainda nao gerado.";
    elements.payload.textContent = confirmed || state.messages.length ? JSON.stringify(payload, null, 2) : "Aguardando confirmacao de envio.";
  }

  function setLoading(elements, loading) {
    state.isLoading = loading;
    elements.input.disabled = loading || state.chatClosed || !state.apiReady;
    elements.submit.disabled = loading || state.chatClosed || !elements.input.value.trim();
    elements.confirm.disabled = loading;
    elements.mic.disabled = loading || state.chatClosed || state.voice.listening;
    elements.write.disabled = loading || state.voice.listening;
    elements.tts.disabled = loading || state.voice.listening || state.voice.speaking || !state.messages.some((entry) => entry.role === "assistant");
  }

  function setVoiceBusy(elements, busy) {
    elements.mic.disabled = busy || state.isLoading || state.chatClosed;
    elements.write.disabled = busy || state.isLoading;
    elements.tts.disabled = busy || state.isLoading || !state.messages.some((entry) => entry.role === "assistant");
  }

  function stopVoiceRecognition() {
    if (state.voice.recognizer) {
      try {
        state.voice.recognizer.close();
      } catch {
        // ignore close errors
      }
    }
    state.voice.recognizer = null;
    state.voice.listening = false;
  }

  function stopCurrentAudio() {
    if (state.voice.currentAudio) {
      try {
        state.voice.currentAudio.pause();
        state.voice.currentAudio.currentTime = 0;
      } catch {
        // ignore media errors
      }
    }
    state.voice.currentAudio = null;
    state.voice.speaking = false;
  }
}

function resolvePanelCopy(config) {
  const panel = config?.sdr?.conversation_panel || {};
  const isLegal = String(config?.segment || "").includes("advoc");
  return {
    badge: panel.badge || "Piloto",
    title: panel.title || (isLegal ? "Advocacia SDR Voz - Atendimento" : "Painel de atendimento"),
    subtitle: panel.subtitle || "Triagem inicial em texto com estrutura pronta para voz premium.",
    assistantTitle: panel.assistant_title || (isLegal ? "Assistente de triagem juridica" : "Assistente de conversa"),
    openingMessage:
      panel.opening_message || config?.sdr?.opening_message || "Ola. Posso organizar esta conversa inicial para agilizar o atendimento.",
    primaryMicLabel: panel.primary_mic_label || "Iniciar microfone (voz premium)",
    alternateTextLabel: panel.alternate_text_label || "Prefiro escrever",
    voiceReadyMessage: panel.voice_ready_message || "Modo voz premium preparado para integracao futura com STT/TTS.",
    voiceUnavailableMessage:
      panel.voice_unavailable_message ||
      "Nao foi possivel iniciar o Azure Speech agora. O painel continua disponivel em modo texto.",
    listeningMessage: panel.listening_message || "Estou a ouvir. Fale agora.",
    speakingMessage: panel.speaking_message || "A ler a ultima resposta em voz.",
    transcriptionReadyMessage: panel.transcription_ready_message || "Transcricao capturada e enviada para a Dora.",
    noSpeechDetectedMessage: panel.no_speech_detected_message || "Nao consegui captar fala valida. Pode tentar de novo ou escrever.",
    listenReplyLabel: panel.listen_reply_label || "Ouvir resposta",
    ttsReadyMessage: panel.tts_ready_message || "Estrutura pronta para TTS na proxima etapa.",
    ttsFallbackMessage: panel.tts_fallback_message || "Azure TTS indisponivel. Usei a leitura local do browser como fallback.",
    ttsErrorMessage: panel.tts_error_message || "Nao consegui ler a resposta em voz neste momento.",
    statusTitle: panel.status_title || "Status da conversa",
    channelActiveLabel: panel.channel_active_label || "Canal ativo",
    handoffSectionTitle: panel.handoff_section_title || "Dados para encaminhamento",
    nameLabel: panel.name_label || "Nome",
    namePlaceholder: panel.name_placeholder || "Nome do cliente",
    contactLabel: panel.contact_label || "Contacto",
    contactPlaceholder: panel.contact_placeholder || "Telefone ou email",
    classificationLabel: panel.classification_label || "Classificacao",
    classificationOptions: Array.isArray(panel.classification_options) && panel.classification_options.length
      ? panel.classification_options
      : [{ value: "outro", label: "Outro" }],
    urgencyLabel: panel.urgency_label || "Urgencia",
    summaryTitle: panel.summary_title || "Resumo estruturado",
    payloadTitle: panel.payload_title || "Payload estruturado",
    inputLabel: panel.input_label || "Mensagem",
    inputPlaceholder: panel.input_placeholder || config?.sdr?.input_placeholder || "Descreva seu contexto",
    sendLabel: panel.send_label || config?.sdr?.send_button_label || "Enviar",
    confirmLabel: panel.confirm_label || "Confirmar envio",
    payloadReadyMessage: panel.payload_ready_message || "Resumo e payload preparados para continuidade.",
    fallbackReply: panel.fallback_reply || config?.sdr?.fallback_reply || "Posso seguir com a proxima etapa da conversa.",
    errorMessage:
      panel.error_message || config?.sdr?.error_message || "Nao consegui processar agora. Posso tentar novamente em alguns segundos?",
    closedMessage:
      panel.closed_message ||
      config?.sdr?.handoff_done_message ||
      "Perfeito. Seu pedido foi enviado com prioridade.\nNosso time continua o atendimento pelos canais informados.",
    typingMessage: panel.typing_message || config?.sdr?.typing_message || "Atendimento digitando...",
    classificationSummaryLabel: panel.classification_summary_label || panel.classification_label || "Classificacao",
    mainReportLabel: panel.main_report_label || "Relato principal",
    payloadKeys: {
      classification: panel?.payload_keys?.classification || "classificacao",
      summary: panel?.payload_keys?.summary || "resumo",
      transcript: panel?.payload_keys?.transcript || "conversa_texto"
    },
    metadataSource: panel.metadata_source || `site_sdr_panel_${config?.client_slug || "template"}`,
    voiceRecognitionLanguage: panel.voice_recognition_language || "pt-PT",
    voiceSynthesisLanguage: panel.voice_synthesis_language || "pt-PT",
    voiceName: panel.voice_name || "pt-PT-RaquelNeural",
    security: panel.security_phrase
      ? {
          phrase: panel.security_phrase,
          terms: Array.isArray(panel.security_terms) && panel.security_terms.length ? panel.security_terms : LEGAL_SENSITIVE_TERMS
        }
      : null
  };
}

function buildSummary(copy, messages, caseData) {
  const clienteTexts = messages.filter((entry) => entry.role === "user").map((entry) => entry.text);
  const ultimoRelato = clienteTexts[clienteTexts.length - 1] || "-";
  const classificationLabel = resolveClassificationLabel(copy, caseData.classification);
  return [
    `${copy.nameLabel}: ${caseData.nome || "-"}`,
    `${copy.contactLabel}: ${caseData.contacto || "-"}`,
    `${copy.classificationSummaryLabel}: ${classificationLabel}`,
    `${copy.urgencyLabel}: ${caseData.urgencia || "-"}`,
    `${copy.channelActiveLabel}: ${caseData.canal || "-"}`,
    `${copy.mainReportLabel}: ${ultimoRelato}`
  ].join("\n");
}

function buildPayload(copy, messages, caseData, ids) {
  const classificationLabel = resolveClassificationLabel(copy, caseData.classification);
  return {
    nome: caseData.nome || "-",
    contacto: caseData.contacto || "-",
    urgencia: caseData.urgencia || "-",
    canal: caseData.canal || "-",
    [copy.payloadKeys.classification]: classificationLabel,
    [copy.payloadKeys.summary]: buildSummary(copy, messages, caseData),
    [copy.payloadKeys.transcript]: buildTranscript(messages),
    metadata: {
      conversation_id: ids.conversationId,
      visitor_id: ids.visitorId,
      source: copy.metadataSource,
      ready_for_clickup: true
    }
  };
}

function buildTranscript(messages) {
  return messages
    .filter((entry) => entry.role !== "system")
    .map((entry) => `${roleLabel(entry.role)}: ${entry.text}`)
    .join("\n");
}

function resolveClassificationLabel(copy, value) {
  const matched = (copy.classificationOptions || []).find((option) => option.value === value);
  return matched?.label || value || "-";
}

function hasSensitiveContent(text, terms) {
  const normalized = String(text || "").toLowerCase();
  return terms.some((term) => normalized.includes(String(term || "").toLowerCase()));
}

function roleLabel(role) {
  if (role === "user") return "Cliente";
  if (role === "assistant") return "Dora";
  return "Sistema";
}

function sourceLabel(source) {
  if (source === "stt") return "STT";
  if (source === "typed") return "Texto";
  return "Sistema";
}

function statusLabel(status) {
  if (status === "ouvindo") return "Ouvindo";
  if (status === "processando") return "Processando";
  if (status === "respondendo") return "Respondendo";
  return "Pronto";
}

function getOrCreateId(storageKey, prefix) {
  const current = window.localStorage.getItem(storageKey);
  if (current) return current;
  const generated = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(storageKey, generated);
  return generated;
}

function readStateSnapshot(storageKey) {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeStateSnapshot(storageKey, snapshot) {
  if (!snapshot || typeof snapshot !== "object") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
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

function resolveProxyPath(localApiBase, configuredPath) {
  const base = String(localApiBase || "/api").replace(/\/+$/, "");
  const path = String(configuredPath || "").trim();

  if (!path) return `${base}/sdr/chat`;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/api/")) return path;
  if (path.startsWith("/")) return `${base}${path}`;
  return `${base}/${path}`;
}

async function loadSpeechSdk() {
  if (window.SpeechSDK) {
    return window.SpeechSDK;
  }

  if (!speechSdkPromise) {
    speechSdkPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-azure-speech-sdk="true"]');
      if (existing && window.SpeechSDK) {
        resolve(window.SpeechSDK);
        return;
      }

      const script = existing || document.createElement("script");
      script.src = AZURE_SPEECH_SDK_URL;
      script.async = true;
      script.dataset.azureSpeechSdk = "true";
      script.onload = () => {
        if (window.SpeechSDK) {
          resolve(window.SpeechSDK);
          return;
        }
        reject(new Error("speech_sdk_not_loaded"));
      };
      script.onerror = () => reject(new Error("speech_sdk_load_failed"));
      if (!existing) {
        document.head.appendChild(script);
      }
    }).catch((error) => {
      speechSdkPromise = null;
      throw error;
    });
  }

  return speechSdkPromise;
}

async function fetchVoiceToken(apiBaseUrl) {
  const response = await fetch(resolveProxyPath(apiBaseUrl, "/voice/token"), {
    method: "POST",
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    const data = await safeJson(response);
    const detail = data?.error ? `${response.status}:${data.error}` : `HTTP ${response.status}`;
    throw new Error(detail);
  }

  const data = await response.json();
  if (!data?.token || !data?.region) {
    throw new Error("voice_token_invalid");
  }
  return data;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeRecognizedText(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  return normalized.replace(/[.]+$/, "").trim();
}

function resolveVoiceErrorMessage(error, fallbackMessage) {
  const raw = String(error?.message || error || "");
  if (raw.includes("voice_not_configured") || raw.includes("azure_speech_not_configured")) {
    return "Azure Speech ainda nao esta configurado neste projeto. Defina as envs do servico para ativar voz.";
  }
  if (raw.includes("secure_context_required")) {
    return "Microfone requer contexto seguro (HTTPS ou localhost).";
  }
  if (raw.includes("speech_sdk_load_failed") || raw.includes("speech_sdk_not_loaded")) {
    return "Nao consegui carregar o SDK de voz da Azure no browser.";
  }
  if (raw.includes("401") || raw.includes("403")) {
    return "Azure Speech recusou a autenticacao. Revise chave e regiao configuradas no projeto.";
  }
  return fallbackMessage;
}

function playBrowserSpeechFallback(text, language = "pt-PT") {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    return false;
  }

  const utterance = new SpeechSynthesisUtterance(String(text || ""));
  utterance.lang = language;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}
