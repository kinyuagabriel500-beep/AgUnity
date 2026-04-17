const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { bootstrapFarmer } = require("../controllers/onboarding.controller");

const router = Router();

router.use(requireAuth);
router.post("/onboarding/bootstrap", bootstrapFarmer);

module.exports = router;