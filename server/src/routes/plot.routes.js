const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { listPlots, createPlot, updatePlot, deletePlot } = require("../controllers/plot.controller");

const router = Router();

router.use(requireAuth);
router.get("/plots", listPlots);
router.post("/plots", createPlot);
router.patch("/plots/:plotId", updatePlot);
router.delete("/plots/:plotId", deletePlot);

module.exports = router;