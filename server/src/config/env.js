const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || process.env.SERVER_PORT || 4000),
  host: process.env.SERVER_HOST || "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET || "change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/agunity",
  databaseSsl: ["1", "true", "yes"].includes(String(process.env.DATABASE_SSL || "").toLowerCase()),
  polygonRpcUrl: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
  polygonPrivateKey: process.env.POLYGON_PRIVATE_KEY || "",
  ipfsApiUrl: process.env.IPFS_API_URL || "",
  ipfsApiToken: process.env.IPFS_API_TOKEN || "",
  ipfsGatewayUrl: process.env.IPFS_GATEWAY_URL || "https://ipfs.io/ipfs/",
  aiServiceBaseUrl:
    process.env.AI_SERVICE_BASE_URL || process.env.AI_SERVICE_URL || "http://localhost:8000",
  publicApiBaseUrl:
    process.env.PUBLIC_API_BASE_URL || process.env.PUBLIC_API_URL || "http://localhost:4000",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  paymentDefaultCurrency: process.env.PAYMENT_DEFAULT_CURRENCY || "KES",
  paymentReconciliationCron: process.env.PAYMENT_RECONCILIATION_CRON || "*/30 * * * *",
  publicWebhookBaseUrl: process.env.PUBLIC_WEBHOOK_BASE_URL || "http://localhost:4000",
  mpesaEnv: process.env.MPESA_ENV || "sandbox",
  mpesaConsumerKey: process.env.MPESA_CONSUMER_KEY || "",
  mpesaConsumerSecret: process.env.MPESA_CONSUMER_SECRET || "",
  mpesaShortcode: process.env.MPESA_SHORTCODE || "",
  mpesaPasskey: process.env.MPESA_PASSKEY || "",
  mpesaCallbackUrl: process.env.MPESA_CALLBACK_URL || "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  stripeSuccessUrl: process.env.STRIPE_SUCCESS_URL || "",
  stripeCancelUrl: process.env.STRIPE_CANCEL_URL || ""
};
