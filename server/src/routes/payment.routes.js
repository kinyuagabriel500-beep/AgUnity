const { Router } = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  createCheckout,
  findMyTransaction,
  verifyTransaction,
  handleStripeWebhook,
  handleMpesaWebhook,
  runReconciliation,
} = require("../controllers/payment.controller");

const router = Router();

router.post("/payments/webhooks/stripe", handleStripeWebhook);
router.post("/payments/webhooks/mpesa", handleMpesaWebhook);

router.post("/payments/checkout", requireAuth, createCheckout);
router.get("/payments/:transactionId", requireAuth, findMyTransaction);
router.post("/payments/:transactionId/verify", requireAuth, verifyTransaction);
router.post("/admin/payments/reconcile", requireAuth, requireRole("admin"), runReconciliation);

module.exports = router;
