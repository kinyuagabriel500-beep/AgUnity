const env = require("../../config/env");

const getMpesaBaseUrl = () => {
  if ((env.mpesaEnv || "sandbox").toLowerCase() === "live") {
    return "https://api.safaricom.co.ke";
  }
  return "https://sandbox.safaricom.co.ke";
};

const toTimestamp = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
};

const normalizeKenyaPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  throw new Error("Invalid Kenyan phone number. Use 07XXXXXXXX or 2547XXXXXXXX");
};

const getAccessToken = async () => {
  if (!env.mpesaConsumerKey || !env.mpesaConsumerSecret) {
    throw new Error("M-Pesa is not configured. Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET");
  }

  const basicAuth = Buffer.from(`${env.mpesaConsumerKey}:${env.mpesaConsumerSecret}`).toString("base64");
  const response = await fetch(`${getMpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`M-Pesa auth failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.access_token;
};

const getStkPassword = (timestamp) => {
  if (!env.mpesaShortcode || !env.mpesaPasskey) {
    throw new Error("M-Pesa is not configured. Missing MPESA_SHORTCODE or MPESA_PASSKEY");
  }
  return Buffer.from(`${env.mpesaShortcode}${env.mpesaPasskey}${timestamp}`).toString("base64");
};

const initiateStkPush = async ({ amountKes, phoneNumber, accountReference, transactionDesc }) => {
  const token = await getAccessToken();
  const timestamp = toTimestamp();
  const password = getStkPassword(timestamp);
  const callbackUrl = env.mpesaCallbackUrl || `${env.publicWebhookBaseUrl}/api/payments/webhooks/mpesa`;
  const normalizedPhone = normalizeKenyaPhone(phoneNumber);

  const payload = {
    BusinessShortCode: env.mpesaShortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(Number(amountKes)),
    PartyA: normalizedPhone,
    PartyB: env.mpesaShortcode,
    PhoneNumber: normalizedPhone,
    CallBackURL: callbackUrl,
    AccountReference: accountReference.slice(0, 12),
    TransactionDesc: (transactionDesc || "AGUNITY Payment").slice(0, 13),
  };

  const response = await fetch(`${getMpesaBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || data.ResponseCode !== "0") {
    throw new Error(data.errorMessage || data.ResponseDescription || "M-Pesa STK push failed");
  }

  return {
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID,
    customerMessage: data.CustomerMessage,
    response: data,
    normalizedPhone,
  };
};

const queryStkPushStatus = async (checkoutRequestId) => {
  const token = await getAccessToken();
  const timestamp = toTimestamp();
  const password = getStkPassword(timestamp);

  const payload = {
    BusinessShortCode: env.mpesaShortcode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const response = await fetch(`${getMpesaBaseUrl()}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.errorMessage || `M-Pesa status query failed with ${response.status}`);
  }

  return data;
};

module.exports = {
  initiateStkPush,
  queryStkPushStatus,
  normalizeKenyaPhone,
};
