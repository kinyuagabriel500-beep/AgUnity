const { Router } = require("express");
const {
  listFarms,
  listActivities,
  createFarm,
  createActivity,
  createExpense,
  createHarvest
} = require("../controllers/farm.controller");
const { requireAuth } = require("../middleware/auth");

const router = Router();

router.use(requireAuth);
router.get("/farms", listFarms);
router.post("/farms", createFarm);
router.get("/activities", listActivities);
router.post("/activities", createActivity);
router.post("/expenses", createExpense);
router.post("/harvests", createHarvest);

module.exports = router;
