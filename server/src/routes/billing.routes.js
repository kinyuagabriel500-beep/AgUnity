const { Router } = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  listPlans,
  getMySubscription,
  subscribePlan,
  topupCredits,
  createProblemTicket,
  listMyTickets,
  getAdminBillingOverview,
} = require("../controllers/billing.controller");

const router = Router();

router.use(requireAuth);

router.get("/billing/plans", listPlans);
router.get("/billing/subscription", getMySubscription);
router.post("/billing/subscribe", subscribePlan);
router.post("/billing/topup-credits", topupCredits);
router.post("/billing/problem-tickets", createProblemTicket);
router.get("/billing/problem-tickets", listMyTickets);
router.get("/billing/admin-overview", requireRole("admin"), getAdminBillingOverview);

module.exports = router;
