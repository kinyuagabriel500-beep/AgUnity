const { Router } = require("express");
const { getFarmProfit } = require("../controllers/profit.controller");
const { requireAuth } = require("../middleware/auth");

const router = Router();

router.use(requireAuth);
router.get("/farm-profit", getFarmProfit);
router.get("/farm-profit/:farmId", getFarmProfit);

module.exports = router;
