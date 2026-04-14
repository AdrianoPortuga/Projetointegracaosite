import { applyVoiceCors, readJsonBody, resolveVoiceConfig } from "../_lib/voice.js";

function buildSsml({ text, voiceName, language }) {
  const escaped = String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  return [
    `<speak version="1.0" xml:lang="${language}">`,
    `<voice xml:lang="${language}" name="${voiceName}">`,
    escaped,
    "</voice>",
    "</speak>"
  ].join("");
}

export default async function handler(req, res) {
  applyVoiceCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed", allowed: ["POST", "OPTIONS"] });
    return;
  }

  const config = resolveVoiceConfig();
  if (!config.configured) {
    res.status(503).json({ error: "azure_speech_not_configured" });
    return;
  }

  const body = readJsonBody(req);
  const text = String(body?.text || "").trim();
  const voiceName = String(body?.voiceName || config.voiceName).trim();
  const language = String(body?.language || "pt-PT").trim();

  if (!text) {
    res.status(400).json({ error: "text_required" });
    return;
  }

  try {
    const response = await fetch(`https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": config.key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-64kbitrate-mono-mp3",
        "User-Agent": "ProjetoIntegracaoSiteVoicePanel"
      },
      body: buildSsml({ text, voiceName, language })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`azure_tts_http_${response.status}:${detail}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    res.status(200).json({
      contentType: "audio/mpeg",
      audioBase64: Buffer.from(arrayBuffer).toString("base64")
    });
  } catch (error) {
    console.error("[voice:tts] azure_error", error?.message || error);
    res.status(502).json({ error: "azure_tts_upstream_error" });
  }
}
