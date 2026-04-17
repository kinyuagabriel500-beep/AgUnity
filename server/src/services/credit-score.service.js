const { Farm, Harvest, Activity } = require("../db/models");

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const toNumber = (value) => Number(value || 0);

const calculateCreditScore = async (userId, farmId) => {
  const farm = await Farm.findOne({ where: { id: farmId, userId } });
  if (!farm) {
    const err = new Error("Farm not found");
    err.statusCode = 404;
    throw err;
  }

  const [harvests, activities] = await Promise.all([
    Harvest.findAll({ where: { farmId } }),
    Activity.findAll({ where: { farmId } })
  ]);

  const totalYieldKg = harvests.reduce((sum, record) => sum + toNumber(record.quantityKg), 0);
  const harvestCount = harvests.length;
  const activityCount = activities.length;

  const monthlyActivityDensity = activityCount / 6;
  const yieldScore = clamp((totalYieldKg / 10000) * 45, 0, 45);
  const consistencyScore = clamp((harvestCount / 6) * 30, 0, 30);
  const activityScore = clamp(monthlyActivityDensity * 25, 0, 25);

  const totalScore = Math.round(yieldScore + consistencyScore + activityScore);

  return {
    score: totalScore,
    factors: {
      yieldScore: Math.round(yieldScore),
      consistencyScore: Math.round(consistencyScore),
      activityScore: Math.round(activityScore)
    },
    inputs: {
      totalYieldKg,
      harvestCount,
      activityCount
    }
  };
};

module.exports = { calculateCreditScore };
