const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { getCreditScore, applyForLoan } = require("../controllers/finance.controller");

const router = Router();

router.use(requireAuth);
router.get("/finance/credit-score", getCreditScore);
router.post("/finance/loan-applications", applyForLoan);

module.exports = router;
