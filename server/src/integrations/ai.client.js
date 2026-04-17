const env = require("../config/env");

const fetchRecentAlerts = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${env.aiServiceBaseUrl}/alerts/recent`, {
      method: "GET",
      signal: controller.signal
    });

    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload.alerts) ? payload.alerts : [];
  } catch (_error) {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
};

const fetchCropRecommendations = async ({ location, crop, season }) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${env.aiServiceBaseUrl}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, crop, season }),
      signal: controller.signal
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const fetchSmartAdvisory = async ({ location, crop, season, activity }) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${env.aiServiceBaseUrl}/smart-advisory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, crop, season, activity }),
      signal: controller.signal
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const askFarmAdvisor = async ({ location, crop, season, question }) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(`${env.aiServiceBaseUrl}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, crop, season, question }),
      signal: controller.signal
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const extractTextFromGemini = (payload) => {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  const parts = candidates[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part) => typeof part?.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
};

const analyzeMediaWithGemini = async ({ mimeType, base64Data, question, location, crop, season }) => {
  if (!env.geminiApiKey) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  const prompt = [
    "You are an agronomy assistant for smallholder farmers.",
    "Analyze the uploaded media and return strict JSON only.",
    "Classify what you detect as one of: disease, pest, nutrient-deficiency, weed, water-stress, livestock-issue, machinery-issue, unknown.",
    "If uncertain, use unknown and explain why.",
    "Provide concise, practical recommendations for the next 48 hours and next 14 days.",
    "Use this farm context:",
    `location=${location || "unknown"}`,
    `crop=${crop || "unknown"}`,
    `season=${season || "unknown"}`,
    `farmer_question=${question || "(none)"}`,
    "Return JSON fields exactly: issueType, title, confidence, findings, immediateActions, followUpPlan, advisoryMessage."
  ].join("\n");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 900
          }
        }),
        signal: controller.signal
      }
    );

    if (!response.ok) return null;
    const payload = await response.json();
    const text = extractTextFromGemini(payload);
    if (!text) return null;

    return {
      rawText: text,
      usage: payload?.usageMetadata || null
    };
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const postToAiService = async (path, body, timeoutMs = 9000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${env.aiServiceBaseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const aiEnterpriseCreate = async (payload) => postToAiService("/enterprise/create", payload, 12000);
const aiEnterpriseGenerateCalendar = async (payload) => postToAiService("/enterprise/generate-calendar", payload, 12000);
const aiEnterprisePredictYield = async (payload) => postToAiService("/enterprise/predict-yield", payload, 10000);
const aiEnterpriseOptimizeCosts = async (payload) => postToAiService("/enterprise/optimize-costs", payload, 10000);
const aiEnterpriseRecommendActions = async (payload) => postToAiService("/enterprise/recommend-actions", payload, 10000);

module.exports = {
  fetchRecentAlerts,
  fetchCropRecommendations,
  fetchSmartAdvisory,
  askFarmAdvisor,
  analyzeMediaWithGemini,
  aiEnterpriseCreate,
  aiEnterpriseGenerateCalendar,
  aiEnterprisePredictYield,
  aiEnterpriseOptimizeCosts,
  aiEnterpriseRecommendActions
};