const { Router } = require("express");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const { getLiveAlerts, getClimatePlan, chatWithAdvisor, chatWithMediaAdvisor } = require("../controllers/advisory.controller");

const router = Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 25 * 1024 * 1024 }
});

router.use(requireAuth);
router.get("/advisory/alerts", getLiveAlerts);
router.get("/advisory/climate-plan", getClimatePlan);
router.post("/advisory/chat", chatWithAdvisor);
router.post("/advisory/chat/media", upload.single("media"), chatWithMediaAdvisor);

module.exports = router;