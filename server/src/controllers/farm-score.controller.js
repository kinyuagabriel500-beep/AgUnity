const { z } = require("zod");
const { Farm, FarmScore } = require("../db/models");
const { calculateFarmScores } = require("../services/farm-score.service");

const querySchema = z.object({
  farmId: z.string().uuid(),
  saveSnapshot: z.string().optional()
});

const getFarmScore = async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);
    const farm = await Farm.findOne({ where: { id: query.farmId, userId: req.user.id } });
    if (!farm) return res.status(404).json({ message: "Farm not found" });

    const score = await calculateFarmScores(query.farmId);
    let snapshotId = null;

    if (query.saveSnapshot === "true") {
      const snapshot = await FarmScore.create({
        farmId: query.farmId,
        productivity: score.productivity,
        sustainability: score.sustainability,
        reliability: score.reliability,
        overall: score.overall
      });
      snapshotId = snapshot.id;
    }

    res.json({
      farmId: query.farmId,
      scale: "0-100",
      scores: {
        productivity: score.productivity,
        sustainability: score.sustainability,
        reliability: score.reliability,
        overall: score.overall
      },
      metrics: score.metrics,
      snapshotId
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getFarmScore };
