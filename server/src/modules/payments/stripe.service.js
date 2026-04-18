const Stripe = require("stripe");
const env = require("../../config/env");

let stripeClient = null;

const getStripeClient = () => {
  if (!env.stripeSecretKey) {
    throw new Error("Stripe is not configured. Missing STRIPE_SECRET_KEY");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.stripeSecretKey, {
      apiVersion: "2024-06-20",
      appInfo: {
        name: "AGUNITY",
        version: "1.0.0"
      }
    });
  }

  return stripeClient;
};

const createCheckoutSession = async ({ transactionId, amountKes, idempotencyKey, email, purpose }) => {
  const stripe = getStripeClient();
  const successUrl = env.stripeSuccessUrl || `${env.publicApiBaseUrl}/payments/success`;
  const cancelUrl = env.stripeCancelUrl || `${env.publicApiBaseUrl}/payments/cancel`;

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      payment_method_types: ["card"],
      customer_email: email || undefined,
      metadata: {
        transactionId,
        idempotencyKey,
        purpose,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "kes",
            product_data: {
              name: "AGUNITY Payment",
              description: purpose || "AGUNITY platform transaction",
            },
            unit_amount: Math.round(Number(amountKes) * 100),
          },
        },
      ],
    },
    {
      idempotencyKey,
    }
  );

  return session;
};

const retrievePaymentIntent = async (paymentIntentId) => {
  const stripe = getStripeClient();
  return stripe.paymentIntents.retrieve(paymentIntentId);
};

const retrieveCheckoutSession = async (sessionId) => {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });
};

const constructWebhookEvent = (rawBody, signature) => {
  if (!env.stripeWebhookSecret) {
    throw new Error("Stripe webhook is not configured. Missing STRIPE_WEBHOOK_SECRET");
  }

  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
};

module.exports = {
  createCheckoutSession,
  retrievePaymentIntent,
  retrieveCheckoutSession,
  constructWebhookEvent,
};
