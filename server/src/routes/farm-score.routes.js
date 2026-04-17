const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { getFarmScore } = require("../controllers/farm-score.controller");

const router = Router();

router.use(requireAuth);
router.get("/farm-score", getFarmScore);

module.exports = router;
