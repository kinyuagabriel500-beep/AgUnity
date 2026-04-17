const crypto = require("crypto");
const { Op } = require("sequelize");
const { z } = require("zod");
const {
  PaymentTransaction,
  PaymentWebhookEvent,
} = require("../db/models");
const {
  createCheckoutSession,
  constructWebhookEvent,
  retrievePaymentIntent,
  retrieveCheckoutSession,
} = require("../modules/payments/stripe.service");
const {
  initiateStkPush,
  queryStkPushStatus,
  normalizeKenyaPhone,
} = require("../modules/payments/mpesa.service");
const { reconcileStalePayments } = require("../services/payment.reconciliation");

const checkoutSchema = z.object({
  provider: z.enum(["stripe", "mpesa"]),
  amountKes: z.coerce.number().positive().max(1000000),
  purpose: z.string().min(2).max(120),
  email: z.string().email().optional(),
  phoneNumber: z.string().min(9).max(20).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const transactionStatusMap = {
  pending: "pending",
  paid: "paid",
  failed: "failed",
  refunded: "refunded",
};

const buildIdempotencyKey = (req) => {
  const fromHeader = req.header("Idempotency-Key");
  if (fromHeader && fromHeader.length > 4) return fromHeader;

  return crypto
    .createHash("sha256")
    .update(`${req.user.id}:${JSON.stringify(req.body || {})}`)
    .digest("hex")
    .slice(0, 64);
};

const createCheckout = async (req, res, next) => {
  try {
    const payload = checkoutSchema.parse(req.body);
    const idempotencyKey = buildIdempotencyKey(req);

    const existing = await PaymentTransaction.findOne({
      where: {
        userId: req.user.id,
        providerReference: `idemp:${idempotencyKey}`,
      },
    });

    if (existing) {
      return res.json({
        idempotentReplay: true,
        transaction: existing,
      });
    }

    const transaction = await PaymentTransaction.create({
      userId: req.user.id,
      amountKes: payload.amountKes,
      currency: "KES",
      provider: payload.provider,
      status: "pending",
      providerReference: `idemp:${idempotencyKey}`,
      metadata: {
        ...(payload.metadata || {}),
        purpose: payload.purpose,
        idempotencyKey,
        internalStatus: "pending",
        verificationStatus: "unverified",
      },
    });

    if (payload.provider === "stripe") {
      const session = await createCheckoutSession({
        transactionId: transaction.id,
        amountKes: payload.amountKes,
        idempotencyKey,
        email: payload.email,
        purpose: payload.purpose,
      });

      transaction.metadata = {
        ...(transaction.metadata || {}),
        stripe: {
          sessionId: session.id,
          checkoutUrl: session.url,
          externalStatus: session.status || "open",
        },
        internalStatus: "processing",
      };
      await transaction.save();

      return res.status(201).json({
        provider: "stripe",
        checkoutUrl: session.url,
        transaction,
      });
    }

    const normalizedPhone = normalizeKenyaPhone(payload.phoneNumber);
    const mpesa = await initiateStkPush({
      amountKes: payload.amountKes,
      phoneNumber: normalizedPhone,
      accountReference: `UFIP-${transaction.id.slice(0, 8)}`,
      transactionDesc: payload.purpose,
    });

    transaction.metadata = {
      ...(transaction.metadata || {}),
      mpesa: {
        checkoutRequestId: mpesa.checkoutRequestId,
        merchantRequestId: mpesa.merchantRequestId,
        response: mpesa.response,
      },
      externalStatus: "0",
      internalStatus: "processing",
    };
    transaction.providerReference = mpesa.checkoutRequestId;
    transaction.metadata = {
      ...(transaction.metadata || {}),
      phoneNumber: mpesa.normalizedPhone,
    };
    await transaction.save();

    return res.status(201).json({
      provider: "mpesa",
      customerMessage: mpesa.customerMessage,
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

const findMyTransaction = async (req, res, next) => {
  try {
    const item = await PaymentTransaction.findOne({
      where: {
        id: req.params.transactionId,
        userId: req.user.id,
      },
    });

    if (!item) {
      return res.status(404).json({ message: "Payment transaction not found" });
    }

    res.json({
      item,
      status: transactionStatusMap[item.status] || item.status,
    });
  } catch (error) {
    next(error);
  }
};

const verifyTransaction = async (req, res, next) => {
  try {
    const item = await PaymentTransaction.findOne({
      where: {
        id: req.params.transactionId,
        userId: req.user.id,
      },
    });

    if (!item) {
      return res.status(404).json({ message: "Payment transaction not found" });
    }

    if (item.provider === "stripe") {
      let intent = null;
      const stripeMeta = item.metadata?.stripe || {};
      if (stripeMeta.paymentIntentId) {
        intent = await retrievePaymentIntent(stripeMeta.paymentIntentId);
      } else if (stripeMeta.sessionId) {
        const session = await retrieveCheckoutSession(stripeMeta.sessionId);
        intent = session.payment_intent || null;
      }

      if (intent) {
        const status =
          intent.status === "succeeded"
            ? "paid"
            : ["requires_payment_method", "canceled"].includes(intent.status)
            ? "failed"
            : "pending";

        item.status = status;
        item.metadata = {
          ...(item.metadata || {}),
          stripe: {
            ...(item.metadata?.stripe || {}),
            paymentIntentId: intent.id,
            externalStatus: intent.status,
            lastResponse: intent,
          },
          externalStatus: intent.status,
          internalStatus: status === "pending" ? "processing" : status,
          verificationStatus: status === "paid" ? "verified" : status === "failed" ? "failed" : "unverified",
          paidAt: status === "paid" ? (item.metadata?.paidAt || new Date().toISOString()) : item.metadata?.paidAt,
        };
        await item.save();
      }
    }

    if (item.provider === "mpesa") {
      const checkoutRequestId = item.metadata?.mpesa?.checkoutRequestId;
      if (!checkoutRequestId) {
        return res.status(400).json({ message: "M-Pesa transaction missing CheckoutRequestID" });
      }
      const result = await queryStkPushStatus(checkoutRequestId);
      const status = String(result.ResultCode) === "0" ? "paid" : ["1032", "1037", "2001"].includes(String(result.ResultCode)) ? "failed" : "pending";

      item.status = status;
      item.metadata = {
        ...(item.metadata || {}),
        mpesa: {
          ...(item.metadata?.mpesa || {}),
          query: result,
        },
        externalStatus: String(result.ResultCode || ""),
        internalStatus: status === "pending" ? "processing" : status,
        verificationStatus: status === "paid" ? "verified" : status === "failed" ? "failed" : "unverified",
      };
      if (status === "failed") {
        item.metadata = {
          ...(item.metadata || {}),
          failureCode: String(result.ResultCode || ""),
          failureMessage: result.ResultDesc || "Payment failed",
        };
      }
      if (status === "paid") {
        item.metadata = {
          ...(item.metadata || {}),
          paidAt: item.metadata?.paidAt || new Date().toISOString(),
        };
      }
      await item.save();
    }

    res.json({ item });
  } catch (error) {
    next(error);
  }
};

const upsertWebhookEvent = async ({ provider, eventId, signatureValid, payload }) => {
  const existing = await PaymentWebhookEvent.findOne({
    where: { provider, eventId },
  });
  if (existing) {
    return { event: existing, alreadyProcessed: true };
  }

  const event = await PaymentWebhookEvent.create({
    provider,
    eventId,
    signatureValid,
    payload,
    processedAt: new Date(),
  });

  return { event, alreadyProcessed: false };
};

const handleStripeWebhook = async (req, res, next) => {
  try {
    const signature = req.header("stripe-signature");
    if (!signature) {
      return res.status(400).json({ message: "Missing stripe-signature header" });
    }

    const event = constructWebhookEvent(req.rawBody, signature);
    const eventId = event.id;
    const stored = await upsertWebhookEvent({
      provider: "stripe",
      eventId,
      signatureValid: true,
      payload: event,
    });

    if (stored.alreadyProcessed) {
      return res.json({ ok: true, duplicate: true });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const transactionId = session?.metadata?.transactionId;

      if (transactionId) {
        const tx = await PaymentTransaction.findOne({ where: { id: transactionId } });
        if (tx) {
          tx.providerReference = tx.providerReference || session.id;
          tx.status = "paid";
          tx.metadata = {
            ...(tx.metadata || {}),
            stripe: {
              ...(tx.metadata?.stripe || {}),
              sessionId: session.id,
              paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : tx.metadata?.stripe?.paymentIntentId,
            },
            webhookEventId: event.id,
            webhookPayload: event,
            externalStatus: "completed",
            internalStatus: "paid",
            verificationStatus: "verified",
            paidAt: tx.metadata?.paidAt || new Date().toISOString(),
          };
          await tx.save();
          stored.event.paymentTransactionId = tx.id;
          await stored.event.save();
        }
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      const tx = await PaymentTransaction.findOne({
        where: {
          provider: "stripe",
          status: { [Op.not]: "paid" },
          metadata: {
            stripe: {
              paymentIntentId: paymentIntent.id,
            },
          },
        },
      });

      if (tx) {
        tx.status = "failed";
        tx.metadata = {
          ...(tx.metadata || {}),
          webhookEventId: event.id,
          webhookPayload: event,
          externalStatus: paymentIntent.status,
          internalStatus: "failed",
          verificationStatus: "failed",
          failureMessage: paymentIntent.last_payment_error?.message || "Stripe payment failed",
        };
        await tx.save();
        stored.event.paymentTransactionId = tx.id;
        await stored.event.save();
      }
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

const extractMpesaCallback = (body) => {
  const stkCallback = body?.Body?.stkCallback || {};
  const items = Array.isArray(stkCallback.CallbackMetadata?.Item)
    ? stkCallback.CallbackMetadata.Item
    : [];

  const byName = items.reduce((acc, item) => {
    if (item?.Name) {
      acc[item.Name] = item.Value;
    }
    return acc;
  }, {});

  return {
    checkoutRequestId: stkCallback.CheckoutRequestID,
    merchantRequestId: stkCallback.MerchantRequestID,
    resultCode: String(stkCallback.ResultCode ?? ""),
    resultDesc: stkCallback.ResultDesc || "",
    amount: byName.Amount,
    mpesaReceiptNumber: byName.MpesaReceiptNumber,
    phoneNumber: byName.PhoneNumber,
    transactionDate: byName.TransactionDate,
  };
};

const handleMpesaWebhook = async (req, res, next) => {
  try {
    const payload = extractMpesaCallback(req.body || {});
    const eventId = `${payload.checkoutRequestId || "unknown"}:${payload.resultCode}`;

    const stored = await upsertWebhookEvent({
      provider: "mpesa",
      eventId,
      signatureValid: true,
      payload: req.body || {},
    });

    if (stored.alreadyProcessed) {
      return res.json({ ResultCode: 0, ResultDesc: "Accepted duplicate callback" });
    }

    const candidates = await PaymentTransaction.findAll({
      where: { provider: "mpesa" },
      order: [["createdAt", "DESC"]],
      limit: 200,
    });

    const matchedTx = candidates.find((row) => row.metadata?.mpesa?.checkoutRequestId === payload.checkoutRequestId) || null;

    if (matchedTx) {
      matchedTx.providerReference = matchedTx.providerReference || payload.checkoutRequestId;

      if (payload.resultCode === "0") {
        matchedTx.status = "paid";
        matchedTx.metadata = {
          ...(matchedTx.metadata || {}),
          mpesa: {
            ...(matchedTx.metadata?.mpesa || {}),
            merchantRequestId: payload.merchantRequestId,
            receiptNumber: payload.mpesaReceiptNumber,
            callback: req.body || {},
          },
          externalStatus: payload.resultCode,
          webhookEventId: eventId,
          webhookPayload: req.body || {},
          internalStatus: "paid",
          verificationStatus: "verified",
          paidAt: matchedTx.metadata?.paidAt || new Date().toISOString(),
        };
      } else {
        matchedTx.status = "failed";
        matchedTx.metadata = {
          ...(matchedTx.metadata || {}),
          mpesa: {
            ...(matchedTx.metadata?.mpesa || {}),
            callback: req.body || {},
          },
          externalStatus: payload.resultCode,
          webhookEventId: eventId,
          webhookPayload: req.body || {},
          internalStatus: "failed",
          verificationStatus: "failed",
          failureCode: payload.resultCode,
          failureMessage: payload.resultDesc,
        };
      }

      await matchedTx.save();
      stored.event.paymentTransactionId = matchedTx.id;
      await stored.event.save();
    }

    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    next(error);
  }
};

const runReconciliation = async (_req, res, next) => {
  try {
    const summary = await reconcileStalePayments();
    res.json({ summary });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCheckout,
  findMyTransaction,
  verifyTransaction,
  handleStripeWebhook,
  handleMpesaWebhook,
  runReconciliation,
};
