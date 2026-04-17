const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  trackPractice,
  getCarbonSummary,
  generateCertificate
} = require("../controllers/carbon.controller");

const router = Router();

router.use(requireAuth);
router.post("/carbon/practices", trackPractice);
router.get("/carbon/summary", getCarbonSummary);
router.post("/carbon/certificate", generateCertificate);

module.exports = router;
