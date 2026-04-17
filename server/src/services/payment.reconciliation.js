const { Op } = require("sequelize");
const { PaymentTransaction } = require("../db/models");
const { retrievePaymentIntent, retrieveCheckoutSession } = require("../modules/payments/stripe.service");
const { queryStkPushStatus } = require("../modules/payments/mpesa.service");

const resolveStatusFromStripeIntent = (intentStatus) => {
  if (["succeeded"].includes(intentStatus)) return "paid";
  if (["requires_payment_method", "canceled"].includes(intentStatus)) return "failed";
  return "processing";
};

const resolveStatusFromMpesaResultCode = (resultCode) => {
  if (String(resultCode) === "0") return "paid";
  if (["1", "1032", "1037", "2001"].includes(String(resultCode))) return "failed";
  return "processing";
};

const reconcileStripeTransaction = async (row) => {
  let intent = null;
  const stripeMeta = row.metadata?.stripe || {};

  if (stripeMeta.paymentIntentId) {
    intent = await retrievePaymentIntent(stripeMeta.paymentIntentId);
  } else if (stripeMeta.sessionId) {
    const session = await retrieveCheckoutSession(stripeMeta.sessionId);
    intent = session.payment_intent || null;
  }

  if (!intent) {
    return { updated: false, reason: "Stripe payment intent not found" };
  }

  const status = resolveStatusFromStripeIntent(intent.status);
  row.status = status;
  row.metadata = {
    ...(row.metadata || {}),
    stripe: {
      ...stripeMeta,
      paymentIntentId: intent.id,
      externalStatus: intent.status,
      lastResponse: intent,
    },
    externalStatus: intent.status,
    internalStatus: status === "pending" ? "processing" : status,
    verificationStatus: status === "paid" ? "verified" : status === "failed" ? "failed" : "unverified",
    reconciledAt: new Date().toISOString(),
    reconciliationNote: "Reconciled via Stripe API",
    paidAt: status === "paid" ? (row.metadata?.paidAt || new Date().toISOString()) : row.metadata?.paidAt,
  };
  await row.save();

  return { updated: true, status };
};

const reconcileMpesaTransaction = async (row) => {
  const checkoutRequestId = row.metadata?.mpesa?.checkoutRequestId;
  if (!checkoutRequestId) {
    return { updated: false, reason: "CheckoutRequestID missing" };
  }

  const query = await queryStkPushStatus(checkoutRequestId);
  const status = resolveStatusFromMpesaResultCode(query.ResultCode);

  row.status = status;
  row.metadata = {
    ...(row.metadata || {}),
    mpesa: {
      ...(row.metadata?.mpesa || {}),
      query,
    },
    externalStatus: String(query.ResultCode || ""),
    internalStatus: status === "pending" ? "processing" : status,
    verificationStatus: status === "paid" ? "verified" : status === "failed" ? "failed" : "unverified",
    reconciledAt: new Date().toISOString(),
    reconciliationNote: "Reconciled via M-Pesa query API",
    paidAt: status === "paid" ? (row.metadata?.paidAt || new Date().toISOString()) : row.metadata?.paidAt,
  };
  if (status === "failed") {
    row.metadata = {
      ...(row.metadata || {}),
      failureCode: String(query.ResultCode || ""),
      failureMessage: query.ResultDesc || "Payment failed",
    };
  }
  await row.save();

  return { updated: true, status };
};

const reconcileStalePayments = async () => {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const staleRows = await PaymentTransaction.findAll({
    where: {
      status: { [Op.in]: ["pending"] },
      updatedAt: { [Op.lt]: cutoff },
    },
    order: [["updatedAt", "ASC"]],
    limit: 200,
  });

  const summary = {
    checked: staleRows.length,
    updated: 0,
    paid: 0,
    failed: 0,
    processing: 0,
    skipped: 0,
    errors: [],
  };

  for (const row of staleRows) {
    try {
      let result = { updated: false };
      if (row.provider === "stripe") {
        result = await reconcileStripeTransaction(row);
      } else if (row.provider === "mpesa") {
        result = await reconcileMpesaTransaction(row);
      } else {
        summary.skipped += 1;
        continue;
      }

      if (result.updated) {
        summary.updated += 1;
        if (result.status === "paid") summary.paid += 1;
        if (result.status === "failed") summary.failed += 1;
        if (result.status === "processing") summary.processing += 1;
      } else {
        summary.skipped += 1;
      }
    } catch (error) {
      summary.errors.push({ transactionId: row.id, message: error.message });
    }
  }

  return summary;
};

module.exports = {
  reconcileStalePayments,
};
