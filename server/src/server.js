require("dotenv").config();

const app = require("./app");
const env = require("./config/env");
const { sequelize } = require("./db/models");
const { DataTypes } = require("sequelize");
const { seedEnterpriseTemplates } = require("./services/enterprise-template.seed");
const { seedBillingPlans } = require("./services/billing.seed");

const ensureRoleColumn = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable("users");
  if (!table.role) {
    await queryInterface.addColumn("users", "role", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "farmer"
    });
  }
};

const ensureSupplyChainColumns = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const salesTable = await queryInterface.describeTable("sales");
  if (!salesTable.batchCode) {
    await queryInterface.addColumn("sales", "batchCode", {
      type: DataTypes.STRING,
      allowNull: true
    });
  }
  if (!salesTable.paymentReference) {
    await queryInterface.addColumn("sales", "paymentReference", {
      type: DataTypes.STRING,
      allowNull: true
    });
  }
  if (!salesTable.paymentVerifiedAt) {
    await queryInterface.addColumn("sales", "paymentVerifiedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
  }
  if (!salesTable.settlementTxHash) {
    await queryInterface.addColumn("sales", "settlementTxHash", {
      type: DataTypes.STRING,
      allowNull: true
    });
  }

  const batchesTable = await queryInterface.describeTable("traceability_batches");
  if (!batchesTable.supplyChainStage) {
    await queryInterface.addColumn("traceability_batches", "supplyChainStage", {
      type: DataTypes.ENUM("farm", "transporter", "warehouse", "retailer", "consumer", "settled"),
      allowNull: false,
      defaultValue: "farm"
    });
  }
  if (!batchesTable.currentStage) {
    await queryInterface.addColumn("traceability_batches", "currentStage", {
      type: DataTypes.ENUM("farm", "transporter", "warehouse", "retailer", "consumer", "settled"),
      allowNull: false,
      defaultValue: "farm"
    });
  }
  if (!batchesTable.transporterName) {
    await queryInterface.addColumn("traceability_batches", "transporterName", {
      type: DataTypes.STRING,
      allowNull: true
    });
  }
  if (!batchesTable.warehouseName) {
    await queryInterface.addColumn("traceability_batches", "warehouseName", {
      type: DataTypes.STRING,
      allowNull: true
    });
  }
  if (!batchesTable.retailerName) {
    await queryInterface.addColumn("traceability_batches", "retailerName", {
      type: DataTypes.STRING,
      allowNull: true
    });
  }
  if (!batchesTable.consumerNote) {
    await queryInterface.addColumn("traceability_batches", "consumerNote", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  }
  if (!batchesTable.settlementStatus) {
    await queryInterface.addColumn("traceability_batches", "settlementStatus", {
      type: DataTypes.ENUM("pending", "verified", "settled", "disputed"),
      allowNull: false,
      defaultValue: "pending"
    });
  }
  if (!batchesTable.settlementReference) {
    await queryInterface.addColumn("traceability_batches", "settlementReference", {
      type: DataTypes.STRING,
      allowNull: true
    });
  }
  if (!batchesTable.settledAt) {
    await queryInterface.addColumn("traceability_batches", "settledAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
  }
  if (!batchesTable.verifiedAt) {
    await queryInterface.addColumn("traceability_batches", "verifiedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
  }
};

const ensureFarmGeoColumns = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const farmsTable = await queryInterface.describeTable("farms");
  if (!farmsTable.country) {
    await queryInterface.addColumn("farms", "country", {
      type: DataTypes.STRING,
      allowNull: true
    });
  }
  if (!farmsTable.locationLatitude) {
    await queryInterface.addColumn("farms", "locationLatitude", {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    });
  }
  if (!farmsTable.locationLongitude) {
    await queryInterface.addColumn("farms", "locationLongitude", {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    });
  }
  if (!farmsTable.locationAccuracyMeters) {
    await queryInterface.addColumn("farms", "locationAccuracyMeters", {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    });
  }
  if (!farmsTable.locationSource) {
    await queryInterface.addColumn("farms", "locationSource", {
      type: DataTypes.STRING,
      allowNull: true
    });
  }
};

const start = async () => {
  try {
    await sequelize.authenticate();
    await ensureRoleColumn();
    await ensureSupplyChainColumns();
    await ensureFarmGeoColumns();
    await sequelize.sync();
    await seedEnterpriseTemplates();
    await seedBillingPlans();
    app.listen(env.port, env.host, () => {
      console.log(`AGUNITY server running on http://${env.host}:${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();
