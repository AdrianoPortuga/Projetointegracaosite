function readVoiceEnv() {
  const key = String(process.env.AZURE_SPEECH_KEY || process.env.AZURE_AI_SPEECH_KEY || "").trim();
  const region = String(process.env.AZURE_SPEECH_REGION || process.env.AZURE_AI_SPEECH_REGION || "").trim();
  const recognitionLanguage = String(process.env.AZURE_SPEECH_RECOGNITION_LANGUAGE || "pt-PT").trim();
  const voiceName = String(process.env.AZURE_SPEECH_VOICE_NAME || "pt-PT-RaquelNeural").trim();
  return { key, region, recognitionLanguage, voiceName };
}

export function resolveVoiceConfig() {
  const config = readVoiceEnv();
  return {
    ...config,
    configured: Boolean(config.key && config.region)
  };
}

export function applyVoiceCors(req, res) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,Accept,Origin");
}

export async function fetchAzureSpeechToken(config) {
  const response = await fetch(`https://${config.region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": config.key,
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": "0"
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`azure_token_http_${response.status}:${detail}`);
  }

  return response.text();
}

export function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string" && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  return null;
}
