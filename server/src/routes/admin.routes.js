const { Router } = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getAnalytics, getEnterpriseOversight } = require("../controllers/admin.controller");

const router = Router();

router.use(requireAuth);
router.get("/admin/analytics", requireRole("admin"), getAnalytics);
router.get("/admin/enterprise-oversight", requireRole("admin"), getEnterpriseOversight);

module.exports = router;