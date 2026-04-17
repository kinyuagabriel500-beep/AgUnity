const { Farm } = require("../db/models");
const { calculateFarmProfit } = require("../services/profit.service");

const getFarmProfit = async (req, res, next) => {
  try {
    const farmId = req.query.farmId || req.params.farmId;
    if (!farmId) {
      return res.status(400).json({ message: "farmId is required" });
    }

    const farm = await Farm.findOne({ where: { id: farmId, userId: req.user.id } });
    if (!farm) return res.status(404).json({ message: "Farm not found" });

    const result = await calculateFarmProfit(farmId);

    return res.json({
      farmId,
      farmName: farm.name,
      currency: "KES",
      totals: {
        activityCost: result.breakdown.activityCost,
        expenseCost: result.breakdown.expenseCost,
        totalCost: result.breakdown.totalCost,
        revenue: result.revenue,
        profit: result.profit
      },
      metadata: {
        salesRevenue: result.breakdown.salesRevenue,
        harvestEstimatedRevenue: result.breakdown.harvestEstimatedRevenue,
        revenueSource: result.breakdown.salesRevenue > 0 ? "sales" : "harvest_estimate"
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getFarmProfit };
