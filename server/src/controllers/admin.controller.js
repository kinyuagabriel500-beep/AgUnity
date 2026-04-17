const { fn, col } = require("sequelize");
const {
  User,
  Farm,
  Sale,
  MarketplaceListing,
  MarketplaceOrder,
  CarbonCertificate,
  Enterprise,
  EnterpriseContract,
  TraceabilityBatch,
} = require("../db/models");

const getAnalytics = async (_req, res, next) => {
  try {
    const [
      totalUsers,
      totalFarms,
      activeListings,
      openOrders,
      certificates,
      sales,
      activeFarmerRows,
      enterpriseRows,
      contractRows,
      stageRows,
      roleRows
    ] = await Promise.all([
      User.count(),
      Farm.count(),
      MarketplaceListing.count({ where: { status: "active" } }),
      MarketplaceOrder.count({ where: { status: "pending" } }),
      CarbonCertificate.findAll({ attributes: ["earningKes", "createdAt"] }),
      Sale.findAll({ attributes: ["quantityKg", "unitPriceKes", "createdAt"] }),
      Farm.findAll({ attributes: ["userId"], group: ["userId"] }),
      Enterprise.findAll({ attributes: ["status"] }),
      EnterpriseContract.findAll({ attributes: ["status"] }),
      TraceabilityBatch.findAll({
        attributes: ["currentStage", [fn("COUNT", col("currentStage")), "count"]],
        group: ["currentStage"],
      }),
      User.findAll({
        attributes: ["role", [fn("COUNT", col("role")), "count"]],
        group: ["role"],
      })
    ]);

    const platformGmvKes = sales.reduce(
      (sum, row) => sum + Number(row.quantityKg || 0) * Number(row.unitPriceKes || 0),
      0
    );

    const carbonKesIssued = certificates.reduce((sum, row) => sum + Number(row.earningKes || 0), 0);

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentTransactions = sales.filter((row) => new Date(row.createdAt).getTime() >= sevenDaysAgo).length;

    const enterpriseByStatus = enterpriseRows.reduce((acc, row) => {
      const key = String(row.status || "unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const contractsByStatus = contractRows.reduce((acc, row) => {
      const key = String(row.status || "unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const supplyChainByStage = stageRows.reduce((acc, row) => {
      const stage = String(row.currentStage || "unknown");
      acc[stage] = Number(row.get("count") || 0);
      return acc;
    }, {});

    const usersByRole = roleRows.reduce((acc, row) => {
      const role = String(row.role || "unknown");
      acc[role] = Number(row.get("count") || 0);
      return acc;
    }, {});

    res.json({
      users: {
        total: totalUsers,
        activeFarmers: activeFarmerRows.length
      },
      farms: {
        total: totalFarms
      },
      marketplace: {
        activeListings,
        openOrders,
        recentTransactions
      },
      finance: {
        platformGmvKes: Math.round(platformGmvKes)
      },
      carbon: {
        certificatesIssued: certificates.length,
        totalKesIssued: Math.round(carbonKesIssued)
      },
      enterprise: {
        total: enterpriseRows.length,
        byStatus: enterpriseByStatus,
      },
      contracts: {
        total: contractRows.length,
        byStatus: contractsByStatus,
      },
      supplyChain: {
        byStage: supplyChainByStage,
      },
      roles: usersByRole,
      system: {
        status: "healthy",
        api: "up",
        dataFreshness: "near-real-time"
      }
    });
  } catch (error) {
    next(error);
  }
};

const getEnterpriseOversight = async (_req, res, next) => {
  try {
    const [latestContracts, latestEnterprises, latestBatches] = await Promise.all([
      EnterpriseContract.findAll({
        include: [
          {
            model: Enterprise,
            attributes: ["id", "name", "type", "subtype"],
            include: [{ model: Farm, attributes: ["id", "name", "location"] }],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: 20,
      }),
      Enterprise.findAll({
        include: [{ model: Farm, attributes: ["name", "location"] }],
        order: [["createdAt", "DESC"]],
        limit: 20,
      }),
      TraceabilityBatch.findAll({
        attributes: ["batchCode", "crop", "currentStage", "settlementStatus", "verificationStatus", "createdAt"],
        order: [["createdAt", "DESC"]],
        limit: 20,
      }),
    ]);

    res.json({
      contracts: latestContracts,
      enterprises: latestEnterprises,
      batches: latestBatches,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAnalytics, getEnterpriseOversight };