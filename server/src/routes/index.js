const { Router } = require("express");
const authRoutes = require("./auth.routes");
const farmRoutes = require("./farm.routes");
const profitRoutes = require("./profit.routes");
const marketplaceRoutes = require("./marketplace.routes");
const financeRoutes = require("./finance.routes");
const carbonRoutes = require("./carbon.routes");
const traceabilityRoutes = require("./traceability.routes");
const farmScoreRoutes = require("./farm-score.routes");
const onboardingRoutes = require("./onboarding.routes");
const advisoryRoutes = require("./advisory.routes");
const adminRoutes = require("./admin.routes");
const enterpriseRoutes = require("./enterprise.routes");
const billingRoutes = require("./billing.routes");
const paymentRoutes = require("./payment.routes");

const router = Router();

router.use("/auth", authRoutes);
router.use("/", farmRoutes);
router.use("/", profitRoutes);
router.use("/", marketplaceRoutes);
router.use("/", financeRoutes);
router.use("/", carbonRoutes);
router.use("/", traceabilityRoutes);
router.use("/", farmScoreRoutes);
router.use("/", onboardingRoutes);
router.use("/", advisoryRoutes);
router.use("/", adminRoutes);
router.use("/", enterpriseRoutes);
router.use("/", billingRoutes);
router.use("/", paymentRoutes);

module.exports = router;
