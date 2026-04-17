const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  createBatch,
  listBatches,
  getBatchByCode,
  getSupplyChainJourney,
  updateWorkflow
} = require("../controllers/traceability.controller");

const router = Router();

router.get("/traceability/batches/:batchCode", getBatchByCode);
router.get("/traceability/journey/:batchCode", getSupplyChainJourney);
router.use(requireAuth);
router.post("/traceability/batches", createBatch);
router.post("/traceability/batches/:batchCode/workflow", updateWorkflow);
router.get("/traceability/batches", listBatches);

module.exports = router;
