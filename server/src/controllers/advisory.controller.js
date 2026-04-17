const { z } = require("zod");
const { Farm, Activity, Harvest, Plot } = require("../db/models");
const { fetchRecentAlerts, fetchCropRecommendations, fetchSmartAdvisory, askFarmAdvisor, analyzeMediaWithGemini } = require("../integrations/ai.client");

const querySchema = z.object({
  farmId: z.string().uuid().optional()
});

const chatSchema = z.object({
  question: z.string().min(3).max(1000),
  farmId: z.string().uuid().optional()
});

const mediaSchema = z.object({
  question: z.string().max(1000).optional().default(""),
  farmId: z.string().uuid().optional()
});

const buildLocationLabel = (farm) => {
  if (!farm) return "";
  if (farm.location) return farm.location;
  const lat = Number(farm.locationLatitude || 0);
  const lon = Number(farm.locationLongitude || 0);
  if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
  return "";
};

const buildCropCalendar = (crop, season) => {
  const current = new Date();
  const month = current.getMonth();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const at = (offset) => months[(month + offset + 12) % 12];
  const normalizedSeason = String(season || "").toLowerCase();

  const rainStart = normalizedSeason.includes("short") ? 0 : normalizedSeason.includes("dry") ? 2 : 1;
  const plantingWindow = `${at(rainStart)}-${at(rainStart + 1)}`;
  const feedingWindow = `${at(rainStart + 1)}-${at(rainStart + 2)}`;
  const protectionWindow = `${at(rainStart + 2)}-${at(rainStart + 3)}`;
  const harvestWindow = `${at(rainStart + 4)}-${at(rainStart + 5)}`;

  return [
    {
      phase: "Land prep & planting",
      window: plantingWindow,
      action: `Prepare fields and plant ${crop} when first effective rains are stable.`
    },
    {
      phase: "Nutrition window",
      window: feedingWindow,
      action: "Split top-dressing and keep soil moisture consistent for stronger root development."
    },
    {
      phase: "Pest & disease scouting",
      window: protectionWindow,
      action: "Scout twice weekly, trigger spraying only when thresholds are reached, and avoid high-rainfall days."
    },
    {
      phase: "Harvest & market prep",
      window: harvestWindow,
      action: "Schedule harvest at physiological maturity, dry produce correctly, and align with market demand windows."
    }
  ];
};

const stripCodeFence = (text) => {
  const trimmed = String(text || "").trim();
  if (!trimmed.startsWith("```") || !trimmed.endsWith("```")) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
};

const normalizeMediaAnalysis = (text, fallbackContext) => {
  const fallback = {
    issueType: "unknown",
    title: "Media analyzed",
    confidence: 0.45,
    findings: [
      "The uploaded media was reviewed, but confidence is limited.",
      "Capture closer, well-lit images focused on affected leaves/stems/fruits for better detection."
    ],
    immediateActions: [
      "Isolate the affected area if spread is visible.",
      "Avoid immediate broad spraying until a clearer diagnosis is confirmed."
    ],
    followUpPlan: [
      "Upload 2 to 3 clearer images from different angles.",
      "Track spread progression over the next 48 hours and record in activities."
    ],
    advisoryMessage:
      "I could not produce a high-confidence diagnosis from this media alone. Share clearer close-up media and recent field observations for a stronger advisory.",
    context: fallbackContext
  };

  try {
    const parsed = JSON.parse(stripCodeFence(text));
    return {
      issueType: String(parsed.issueType || fallback.issueType),
      title: String(parsed.title || fallback.title),
      confidence: Number(parsed.confidence) || fallback.confidence,
      findings: Array.isArray(parsed.findings) ? parsed.findings.slice(0, 6) : fallback.findings,
      immediateActions: Array.isArray(parsed.immediateActions) ? parsed.immediateActions.slice(0, 6) : fallback.immediateActions,
      followUpPlan: Array.isArray(parsed.followUpPlan) ? parsed.followUpPlan.slice(0, 6) : fallback.followUpPlan,
      advisoryMessage: String(parsed.advisoryMessage || fallback.advisoryMessage),
      context: fallbackContext
    };
  } catch (_error) {
    return {
      ...fallback,
      advisoryMessage: text || fallback.advisoryMessage
    };
  }
};

const getLiveAlerts = async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);

    let farm = null;
    if (query.farmId) {
      farm = await Farm.findOne({ where: { id: query.farmId, userId: req.user.id } });
      if (!farm) return res.status(404).json({ message: "Farm not found" });
    } else {
      farm = await Farm.findOne({ where: { userId: req.user.id }, order: [["createdAt", "DESC"]] });
    }

    const aiAlerts = await fetchRecentAlerts();
    const items = aiAlerts.map((alert, index) => ({
      id: `ai-${index}-${alert.timestamp || Date.now()}`,
      title: alert.title || "Advisory",
      message: alert.message || "New advisory is available.",
      severity: "medium",
      source: "ai-service",
      actionLabel: "View advisory",
      createdAt: alert.timestamp || new Date().toISOString()
    }));

    if (!farm) {
      items.unshift({
        id: "onboarding-tip",
        title: "Complete farm setup",
        message: "Add your first farm details to unlock personalized alerts and profit tracking.",
        severity: "high",
        source: "ufip",
        actionLabel: "Start onboarding",
        createdAt: new Date().toISOString()
      });
      return res.json({ items });
    }

    const [latestActivity, harvestCount] = await Promise.all([
      Activity.findOne({ where: { farmId: farm.id }, order: [["date", "DESC"]] }),
      Harvest.count({ where: { farmId: farm.id } })
    ]);

    if (!latestActivity) {
      items.unshift({
        id: "first-activity",
        title: "Log your first field activity",
        message: "Record planting, spraying, or harvest to activate smarter recommendations.",
        severity: "high",
        source: "ufip",
        actionLabel: "Log activity",
        createdAt: new Date().toISOString()
      });
    }

    if (harvestCount === 0) {
      items.push({
        id: "harvest-readiness",
        title: "Harvest records missing",
        message: "Add harvest entries to unlock accurate profit analysis and market matching.",
        severity: "medium",
        source: "ufip",
        actionLabel: "Add harvest",
        createdAt: new Date().toISOString()
      });
    }

    if (items.length === 0) {
      items.push({
        id: "all-good",
        title: "No critical alerts",
        message: "Farm conditions look stable. Keep logging activities daily.",
        severity: "low",
        source: "ufip",
        actionLabel: "Open activities",
        createdAt: new Date().toISOString()
      });
    }

    res.json({ items: items.slice(0, 10) });
  } catch (error) {
    next(error);
  }
};

const getClimatePlan = async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);
    let farm = null;

    if (query.farmId) {
      farm = await Farm.findOne({ where: { id: query.farmId, userId: req.user.id } });
      if (!farm) return res.status(404).json({ message: "Farm not found" });
    } else {
      farm = await Farm.findOne({ where: { userId: req.user.id }, order: [["createdAt", "DESC"]] });
    }

    if (!farm) {
      return res.json({
        farmFound: false,
        message: "Set up a farm profile with GPS location to unlock climate-smart advisory and crop calendar."
      });
    }

    const latestPlot = await Plot.findOne({ where: { farmId: farm.id }, order: [["createdAt", "DESC"]] });
    const crop = latestPlot?.crop || "maize";
    const season = latestPlot?.season || "long-rains";
    const locationLabel = buildLocationLabel(farm);

    const [recommendationPayload, smartAdvisoryPayload] = await Promise.all([
      fetchCropRecommendations({
        location: locationLabel,
        crop,
        season
      }),
      fetchSmartAdvisory({
        location: locationLabel,
        crop,
        season,
        activity: "planting"
      })
    ]);

    const recommendations = recommendationPayload?.recommendations || ["maize", "beans", "sorghum"];
    const weather = smartAdvisoryPayload?.weather || {
      condition: "Unknown",
      rainfall_probability: 50,
      temperature_c: null,
      humidity: null
    };
    const advisory = smartAdvisoryPayload?.advisory || "Monitor rainfall trend and field moisture before major operations.";

    return res.json({
      farmFound: true,
      farmId: farm.id,
      locationLabel,
      country: farm.country || null,
      crop,
      season,
      recommendations,
      rationale: recommendationPayload?.rationale || "Recommendations are based on local climate suitability and season.",
      weather,
      advisoryTitle: "AI Agro-meteorology Guidance",
      advisory,
      triggeredRules: smartAdvisoryPayload?.triggered_rules || [],
      cropCalendar: buildCropCalendar(crop, season)
    });
  } catch (error) {
    next(error);
  }
};

const chatWithAdvisor = async (req, res, next) => {
  try {
    const payload = chatSchema.parse(req.body);
    let farm = null;

    if (payload.farmId) {
      farm = await Farm.findOne({ where: { id: payload.farmId, userId: req.user.id } });
      if (!farm) return res.status(404).json({ message: "Farm not found" });
    } else {
      farm = await Farm.findOne({ where: { userId: req.user.id }, order: [["createdAt", "DESC"]] });
    }

    if (!farm) {
      return res.status(400).json({
        message: "Create a farm profile first so advisory chat can use your location and crop context."
      });
    }

    const latestPlot = await Plot.findOne({ where: { farmId: farm.id }, order: [["createdAt", "DESC"]] });
    const locationLabel = buildLocationLabel(farm) || "farm location";
    const crop = latestPlot?.crop || "maize";
    const season = latestPlot?.season || "long-rains";

    const aiResponse = await askFarmAdvisor({
      question: payload.question,
      location: locationLabel,
      crop,
      season
    });

    if (!aiResponse?.response) {
      return res.json({
        response:
          "I could not reach the advisory engine right now. Keep scouting twice weekly, align operations with expected rainfall, and log farm activities for better recommendations.",
        confidence: 0.45,
        context: {
          location: locationLabel,
          crop,
          season
        }
      });
    }

    return res.json({
      response: aiResponse.response,
      confidence: aiResponse.confidence,
      context: aiResponse.context || {
        location: locationLabel,
        crop,
        season
      }
    });
  } catch (error) {
    next(error);
  }
};

const chatWithMediaAdvisor = async (req, res, next) => {
  try {
    const payload = mediaSchema.parse(req.body || {});
    const mediaFile = req.file;

    if (!mediaFile) {
      return res.status(400).json({ message: "Upload an image, audio, or video file to analyze." });
    }

    if (!mediaFile.mimetype?.startsWith("image/") && !mediaFile.mimetype?.startsWith("audio/") && !mediaFile.mimetype?.startsWith("video/")) {
      return res.status(400).json({ message: "Only image, audio, or video files are supported." });
    }

    let farm = null;
    if (payload.farmId) {
      farm = await Farm.findOne({ where: { id: payload.farmId, userId: req.user.id } });
      if (!farm) return res.status(404).json({ message: "Farm not found" });
    } else {
      farm = await Farm.findOne({ where: { userId: req.user.id }, order: [["createdAt", "DESC"]] });
    }

    if (!farm) {
      return res.status(400).json({
        message: "Create a farm profile first so media advisory can use your location and crop context."
      });
    }

    const latestPlot = await Plot.findOne({ where: { farmId: farm.id }, order: [["createdAt", "DESC"]] });
    const locationLabel = buildLocationLabel(farm) || "farm location";
    const crop = latestPlot?.crop || "maize";
    const season = latestPlot?.season || "long-rains";

    const geminiResult = await analyzeMediaWithGemini({
      mimeType: mediaFile.mimetype,
      base64Data: mediaFile.buffer.toString("base64"),
      question: payload.question,
      location: locationLabel,
      crop,
      season
    });

    if (!geminiResult?.rawText) {
      return res.json({
        issueType: "unknown",
        title: "Media received",
        confidence: 0.35,
        findings: [
          "The upload was received, but the advanced media model is not configured.",
          "Set GEMINI_API_KEY in server environment to enable automatic disease/pest detection from media."
        ],
        immediateActions: [
          "Capture sharper close-ups in daylight for image diagnosis.",
          "Add a short note about observed symptoms and crop stage in your next message."
        ],
        followUpPlan: [
          "Retry media advisory after AI key configuration.",
          "If damage is spreading quickly, consult a local extension officer immediately."
        ],
        advisoryMessage:
          "I can already chat and advise from your farm context. For auto-detection from media, the Gemini API key must be configured on the backend.",
        context: {
          location: locationLabel,
          crop,
          season,
          mediaType: mediaFile.mimetype
        }
      });
    }

    const responsePayload = normalizeMediaAnalysis(geminiResult.rawText, {
      location: locationLabel,
      crop,
      season,
      mediaType: mediaFile.mimetype
    });

    return res.json(responsePayload);
  } catch (error) {
    next(error);
  }
};

module.exports = { getLiveAlerts, getClimatePlan, chatWithAdvisor, chatWithMediaAdvisor };