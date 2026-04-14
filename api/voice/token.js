import { applyVoiceCors, fetchAzureSpeechToken, resolveVoiceConfig } from "../_lib/voice.js";

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

  try {
    const token = await fetchAzureSpeechToken(config);
    res.status(200).json({
      token,
      region: config.region,
      recognitionLanguage: config.recognitionLanguage,
      voiceName: config.voiceName
    });
  } catch (error) {
    console.error("[voice:token] azure_error", error?.message || error);
    res.status(502).json({ error: "azure_token_upstream_error" });
  }
}
