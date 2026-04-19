const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const {
	getCreditScore,
	applyForLoan,
	getInsuranceQuote,
	createInsurancePolicy,
	listInsurancePolicies,
	submitInsuranceClaim
} = require("../controllers/finance.controller");

const router = Router();

router.use(requireAuth);
router.get("/finance/credit-score", getCreditScore);
router.post("/finance/loan-applications", applyForLoan);
router.get("/finance/insurance/quote", getInsuranceQuote);
router.get("/finance/insurance/policies", listInsurancePolicies);
router.post("/finance/insurance/policies", createInsurancePolicy);
router.post("/finance/insurance/claims", submitInsuranceClaim);

module.exports = router;
