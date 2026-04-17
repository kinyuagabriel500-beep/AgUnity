const { Activity, Expense, Harvest, Sale, CarbonPractice } = require("../db/models");

const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));
const toNumber = (value) => Number(value || 0);

const calculateFarmScores = async (farmId) => {
  const [activities, expenses, harvests, sales, practices] = await Promise.all([
    Activity.findAll({ where: { farmId } }),
    Expense.findAll({ where: { farmId } }),
    Harvest.findAll({ where: { farmId } }),
    Sale.findAll({ where: { farmId } }),
    CarbonPractice.findAll({ where: { farmId } })
  ]);

  const totalYieldKg = harvests.reduce((sum, x) => sum + toNumber(x.quantityKg), 0);
  const totalRevenue = sales.reduce((sum, x) => sum + toNumber(x.quantityKg) * toNumber(x.unitPriceKes), 0);
  const totalExpenses = expenses.reduce((sum, x) => sum + toNumber(x.amountKes), 0);
  const marginRatio = totalRevenue > 0 ? (totalRevenue - totalExpenses) / totalRevenue : 0;

  const productivity = clamp((totalYieldKg / 12000) * 70 + Math.max(0, marginRatio) * 30);

  const sustainability = clamp((practices.length / 20) * 65 + (activities.length / 40) * 35);

  const paidOrCompletedSales = sales.filter(
    (s) => ["paid", "partial"].includes(s.paymentStatus)
  ).length;
  const paymentReliability = sales.length > 0 ? (paidOrCompletedSales / sales.length) * 60 : 30;
  const activityReliability = Math.min(40, (activities.length / 24) * 40);
  const reliability = clamp(paymentReliability + activityReliability);

  const overall = clamp(productivity * 0.4 + sustainability * 0.3 + reliability * 0.3);

  return {
    productivity,
    sustainability,
    reliability,
    overall,
    metrics: {
      totalYieldKg,
      totalRevenue,
      totalExpenses,
      activityCount: activities.length,
      carbonPracticeCount: practices.length,
      salesCount: sales.length
    }
  };
};

module.exports = { calculateFarmScores };
