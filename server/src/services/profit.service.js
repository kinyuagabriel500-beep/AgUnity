const { Activity, Expense, Sale, Harvest } = require("../db/models");

const toNumber = (value) => Number(value || 0);

const calculateFarmProfit = async (farmId) => {
  const [activities, expenses, sales, harvests] = await Promise.all([
    Activity.findAll({ where: { farmId } }),
    Expense.findAll({ where: { farmId } }),
    Sale.findAll({ where: { farmId } }),
    Harvest.findAll({ where: { farmId } })
  ]);

  const activityCost = activities.reduce((sum, item) => sum + toNumber(item.costKes), 0);
  const expenseCost = expenses.reduce((sum, item) => sum + toNumber(item.amountKes), 0);
  const totalCost = activityCost + expenseCost;

  const salesRevenue = sales.reduce(
    (sum, item) => sum + toNumber(item.quantityKg) * toNumber(item.unitPriceKes),
    0
  );

  // Fallback for farms with harvest records but no sales yet.
  const harvestEstimatedRevenue = harvests.reduce(
    (sum, item) => sum + toNumber(item.quantityKg) * toNumber(item.unitPriceKes),
    0
  );

  const revenue = salesRevenue > 0 ? salesRevenue : harvestEstimatedRevenue;
  const profit = revenue - totalCost;

  return {
    breakdown: {
      activityCost,
      expenseCost,
      totalCost,
      salesRevenue,
      harvestEstimatedRevenue
    },
    revenue,
    profit
  };
};

module.exports = { calculateFarmProfit };
