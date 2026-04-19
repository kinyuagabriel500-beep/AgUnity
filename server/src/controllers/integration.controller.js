const env = require("../config/env");

const withTimeout = async (promiseFactory, timeoutMs = 2500) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await promiseFactory(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
};

const getIntegrationStatus = async (_req, res, next) => {
  try {
    let aiServiceReachable = false;
    try {
      aiServiceReachable = await withTimeout(async (signal) => {
        const response = await fetch(`${env.aiServiceBaseUrl}/health`, { signal });
        return response.ok;
      });
    } catch (_error) {
      aiServiceReachable = false;
    }

    const response = {
      aiService: {
        baseUrl: env.aiServiceBaseUrl,
        reachable: aiServiceReachable,
        advisoryMode: aiServiceReachable ? "live" : "degraded"
      },
      mediaDiagnosis: {
        geminiConfigured: Boolean(env.geminiApiKey),
        mode: env.geminiApiKey ? "live" : "fallback"
      },
      traceability: {
        ipfs: {
          configured: Boolean(env.ipfsApiUrl),
          mode: env.ipfsApiUrl ? "live-or-fallback" : "simulated"
        },
        polygon: {
          configured: Boolean(env.polygonPrivateKey),
          mode: env.polygonPrivateKey ? "live-or-fallback" : "simulated"
        }
      },
      payments: {
        mpesaConfigured:
          Boolean(env.mpesaConsumerKey) &&
          Boolean(env.mpesaConsumerSecret) &&
          Boolean(env.mpesaShortcode) &&
          Boolean(env.mpesaPasskey),
        stripeConfigured: Boolean(env.stripeSecretKey) && Boolean(env.stripeWebhookSecret)
      },
      readinessScore: [
        aiServiceReachable,
        Boolean(env.geminiApiKey),
        Boolean(env.ipfsApiUrl),
        Boolean(env.polygonPrivateKey),
        Boolean(env.mpesaConsumerKey || env.stripeSecretKey)
      ].filter(Boolean).length
    };

    return res.json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getIntegrationStatus
};