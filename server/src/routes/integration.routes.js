const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { getIntegrationStatus } = require("../controllers/integration.controller");

const router = Router();

router.use(requireAuth);
router.get("/integrations/status", getIntegrationStatus);

module.exports = router;