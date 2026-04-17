const { CarbonPractice } = require("../db/models");

const CREDIT_RATE_KES = 3200;

const FACTORS = {
  no_till: 0.25, // credits per hectare
  tree_planting: 0.02, // credits per tree
  organic_farming: 0.35 // credits per hectare
};

const round = (value, decimals) => Number(value.toFixed(decimals));

const estimatePracticeCredits = (practiceType, value) => {
  const factor = FACTORS[practiceType] || 0;
  return Number(value) * factor;
};

const summarizeCarbonForFarm = async (farmId) => {
  const practices = await CarbonPractice.findAll({
    where: { farmId },
    order: [["recordedAt", "DESC"]]
  });

  const totalCredits = practices.reduce(
    (sum, item) => sum + estimatePracticeCredits(item.practiceType, item.value),
    0
  );
  const earningKes = totalCredits * CREDIT_RATE_KES;

  return {
    totalCredits: round(totalCredits, 3),
    earningKes: round(earningKes, 2),
    marketRateKesPerCredit: CREDIT_RATE_KES,
    practices
  };
};

module.exports = {
  CREDIT_RATE_KES,
  estimatePracticeCredits,
  summarizeCarbonForFarm
};
