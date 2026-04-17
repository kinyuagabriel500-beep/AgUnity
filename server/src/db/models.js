const { DataTypes } = require("sequelize");
const sequelize = require("./sequelize");

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    fullName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    phone: { type: DataTypes.STRING, allowNull: true },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: "farmer" },
    passwordHash: { type: DataTypes.STRING, allowNull: false }
  },
  { tableName: "users", timestamps: true }
);

const Farm = sequelize.define(
  "Farm",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    location: { type: DataTypes.STRING, allowNull: false },
    country: { type: DataTypes.STRING, allowNull: true },
    county: { type: DataTypes.STRING, allowNull: true },
    locationLatitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    locationLongitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    locationAccuracyMeters: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    locationSource: { type: DataTypes.STRING, allowNull: true },
    acreageHectares: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 }
    }
  },
  { tableName: "farms", timestamps: true }
);

const Plot = sequelize.define(
  "Plot",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    crop: { type: DataTypes.STRING, allowNull: true },
    season: { type: DataTypes.STRING, allowNull: true },
    areaHectares: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
    soilType: { type: DataTypes.STRING, allowNull: true }
  },
  {
    tableName: "plots",
    timestamps: true,
    indexes: [{ unique: true, fields: ["farmId", "name"] }]
  }
);

const Activity = sequelize.define(
  "Activity",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    type: {
      type: DataTypes.ENUM("planting", "spraying", "harvesting"),
      allowNull: false
    },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    costKes: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 }
    }
  },
  { tableName: "activities", timestamps: true }
);

const Expense = sequelize.define(
  "Expense",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    category: { type: DataTypes.STRING, allowNull: false },
    amountKes: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0.01 } },
    expenseDate: { type: DataTypes.DATEONLY, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true }
  },
  { tableName: "expenses", timestamps: true }
);

const Harvest = sequelize.define(
  "Harvest",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    crop: { type: DataTypes.STRING, allowNull: false },
    quantityKg: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0.01 } },
    unitPriceKes: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0.01 } },
    harvestDate: { type: DataTypes.DATEONLY, allowNull: false },
    qualityGrade: { type: DataTypes.STRING, allowNull: true }
  },
  { tableName: "harvests", timestamps: true }
);

const Sale = sequelize.define(
  "Sale",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    batchCode: { type: DataTypes.STRING, allowNull: true },
    crop: { type: DataTypes.STRING, allowNull: true },
    buyerName: { type: DataTypes.STRING, allowNull: false },
    quantityKg: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0.01 } },
    unitPriceKes: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0.01 } },
    saleDate: { type: DataTypes.DATEONLY, allowNull: false },
    paymentStatus: {
      type: DataTypes.ENUM("pending", "paid", "partial"),
      allowNull: false,
      defaultValue: "pending"
    },
    paymentReference: { type: DataTypes.STRING, allowNull: true },
    paymentVerifiedAt: { type: DataTypes.DATE, allowNull: true },
    settlementTxHash: { type: DataTypes.STRING, allowNull: true }
  },
  { tableName: "sales", timestamps: true }
);

const MarketplaceListing = sequelize.define(
  "MarketplaceListing",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    crop: { type: DataTypes.STRING, allowNull: false },
    quantityKg: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0.01 } },
    pricePerKgKes: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0.01 } },
    status: {
      type: DataTypes.ENUM("active", "sold", "cancelled"),
      allowNull: false,
      defaultValue: "active"
    }
  },
  { tableName: "marketplace_listings", timestamps: true }
);

const MarketplaceOrder = sequelize.define(
  "MarketplaceOrder",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    quantityKg: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0.01 } },
    offeredPricePerKgKes: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: { min: 0.01 }
    },
    status: {
      type: DataTypes.ENUM("pending", "confirmed", "rejected", "completed"),
      allowNull: false,
      defaultValue: "pending"
    }
  },
  { tableName: "marketplace_orders", timestamps: true }
);

const LoanApplication = sequelize.define(
  "LoanApplication",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    amountKes: { type: DataTypes.DECIMAL(14, 2), allowNull: false, validate: { min: 1000 } },
    durationMonths: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 60 } },
    purpose: { type: DataTypes.STRING, allowNull: false },
    creditScoreSnapshot: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 100 } },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending"
    },
    reviewerNote: { type: DataTypes.TEXT, allowNull: true }
  },
  { tableName: "loan_applications", timestamps: true }
);

const BillingPlan = sequelize.define(
  "BillingPlan",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    code: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    priceKes: { type: DataTypes.DECIMAL(14, 2), allowNull: false, validate: { min: 0 } },
    billingCycle: {
      type: DataTypes.ENUM("monthly", "annual", "oneoff"),
      allowNull: false,
      defaultValue: "monthly"
    },
    includedTickets: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    includedAdvisoryCredits: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  },
  { tableName: "billing_plans", timestamps: true }
);

const UserSubscription = sequelize.define(
  "UserSubscription",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    status: {
      type: DataTypes.ENUM("trial", "active", "past_due", "cancelled", "expired"),
      allowNull: false,
      defaultValue: "active"
    },
    currentPeriodStart: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    currentPeriodEnd: { type: DataTypes.DATE, allowNull: true },
    autoRenew: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    advisoryCreditsRemaining: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
  },
  { tableName: "user_subscriptions", timestamps: true }
);

const PaymentTransaction = sequelize.define(
  "PaymentTransaction",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    amountKes: { type: DataTypes.DECIMAL(14, 2), allowNull: false, validate: { min: 0 } },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: "KES" },
    status: {
      type: DataTypes.ENUM("pending", "paid", "failed", "refunded"),
      allowNull: false,
      defaultValue: "pending"
    },
    provider: { type: DataTypes.STRING, allowNull: true },
    providerReference: { type: DataTypes.STRING, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }
  },
  { tableName: "payment_transactions", timestamps: true }
);

const PaymentWebhookEvent = sequelize.define(
  "PaymentWebhookEvent",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    provider: { type: DataTypes.STRING, allowNull: false },
    eventId: { type: DataTypes.STRING, allowNull: false },
    signatureValid: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    processedAt: { type: DataTypes.DATE, allowNull: true },
    payload: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    processingError: { type: DataTypes.TEXT, allowNull: true }
  },
  {
    tableName: "payment_webhook_events",
    timestamps: true,
    indexes: [{ unique: true, fields: ["provider", "eventId"] }]
  }
);

const ProblemTicket = sequelize.define(
  "ProblemTicket",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    category: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    urgency: {
      type: DataTypes.ENUM("low", "medium", "high"),
      allowNull: false,
      defaultValue: "medium"
    },
    status: {
      type: DataTypes.ENUM("open", "in_progress", "resolved", "closed"),
      allowNull: false,
      defaultValue: "open"
    },
    resolution: { type: DataTypes.TEXT, allowNull: true },
    billedAmountKes: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 }
  },
  { tableName: "problem_tickets", timestamps: true }
);

const CarbonPractice = sequelize.define(
  "CarbonPractice",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    practiceType: {
      type: DataTypes.ENUM("no_till", "tree_planting", "organic_farming"),
      allowNull: false
    },
    value: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0.01 } },
    unit: { type: DataTypes.STRING, allowNull: false },
    recordedAt: { type: DataTypes.DATEONLY, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true }
  },
  { tableName: "carbon_practices", timestamps: true }
);

const CarbonCertificate = sequelize.define(
  "CarbonCertificate",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    certificateCode: { type: DataTypes.STRING, allowNull: false, unique: true },
    totalCredits: { type: DataTypes.DECIMAL(12, 3), allowNull: false, validate: { min: 0 } },
    earningKes: { type: DataTypes.DECIMAL(14, 2), allowNull: false, validate: { min: 0 } },
    issuedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    status: { type: DataTypes.ENUM("issued", "revoked"), allowNull: false, defaultValue: "issued" }
  },
  { tableName: "carbon_certificates", timestamps: true }
);

const TraceabilityBatch = sequelize.define(
  "TraceabilityBatch",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    batchCode: { type: DataTypes.STRING, allowNull: false, unique: true },
    crop: { type: DataTypes.STRING, allowNull: false },
    quantityKg: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0.01 } },
    producedAt: { type: DataTypes.DATEONLY, allowNull: false },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    supplyChainStage: {
      type: DataTypes.ENUM("farm", "transporter", "warehouse", "retailer", "consumer", "settled"),
      allowNull: false,
      defaultValue: "farm"
    },
    currentStage: {
      type: DataTypes.ENUM("farm", "transporter", "warehouse", "retailer", "consumer", "settled"),
      allowNull: false,
      defaultValue: "farm"
    },
    transporterName: { type: DataTypes.STRING, allowNull: true },
    warehouseName: { type: DataTypes.STRING, allowNull: true },
    retailerName: { type: DataTypes.STRING, allowNull: true },
    consumerNote: { type: DataTypes.TEXT, allowNull: true },
    settlementStatus: {
      type: DataTypes.ENUM("pending", "verified", "settled", "disputed"),
      allowNull: false,
      defaultValue: "pending"
    },
    settlementReference: { type: DataTypes.STRING, allowNull: true },
    settledAt: { type: DataTypes.DATE, allowNull: true },
    verifiedAt: { type: DataTypes.DATE, allowNull: true },
    dataHash: { type: DataTypes.STRING, allowNull: false },
    ipfsCid: { type: DataTypes.STRING, allowNull: true },
    ipfsUrl: { type: DataTypes.STRING, allowNull: true },
    polygonTxHash: { type: DataTypes.STRING, allowNull: true },
    qrCodeDataUrl: { type: DataTypes.TEXT, allowNull: false },
    verificationStatus: {
      type: DataTypes.ENUM("pending", "anchored", "simulated"),
      allowNull: false,
      defaultValue: "pending"
    }
  },
  { tableName: "traceability_batches", timestamps: true }
);

const TraceabilityEvent = sequelize.define(
  "TraceabilityEvent",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    eventType: {
      type: DataTypes.ENUM("created", "handoff", "received", "listed", "verified", "settled", "disputed"),
      allowNull: false
    },
    actorRole: {
      type: DataTypes.ENUM("farmer", "transporter", "warehouse", "retailer", "consumer", "admin"),
      allowNull: false
    },
    actorName: { type: DataTypes.STRING, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
    dataHash: { type: DataTypes.STRING, allowNull: false },
    txHash: { type: DataTypes.STRING, allowNull: true },
    verificationStatus: {
      type: DataTypes.ENUM("pending", "anchored", "simulated"),
      allowNull: false,
      defaultValue: "pending"
    },
    metadata: { type: DataTypes.JSONB, allowNull: true }
  },
  { tableName: "traceability_events", timestamps: true }
);

const FarmScore = sequelize.define(
  "FarmScore",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    productivity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 100 } },
    sustainability: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 100 } },
    reliability: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 100 } },
    overall: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 100 } }
  },
  { tableName: "farm_scores", timestamps: true }
);

const EnterpriseTemplate = sequelize.define(
  "EnterpriseTemplate",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    type: { type: DataTypes.STRING, allowNull: false },
    subtype: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    lifecycleStages: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    defaultCalendar: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    requiredInputs: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    expectedOutputs: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    kpis: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    aiRules: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }
  },
  {
    tableName: "enterprise_templates",
    timestamps: true,
    indexes: [{ unique: true, fields: ["type", "subtype"] }]
  }
);

const Enterprise = sequelize.define(
  "Enterprise",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    subtype: { type: DataTypes.STRING, allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.ENUM("active", "paused", "completed"), allowNull: false, defaultValue: "active" },
    scaleUnits: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 1 },
    scaleUnitLabel: { type: DataTypes.STRING, allowNull: false, defaultValue: "units" }
  },
  { tableName: "enterprises", timestamps: true }
);

const EnterpriseActivity = sequelize.define(
  "EnterpriseActivity",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    activityType: { type: DataTypes.STRING, allowNull: false },
    scheduledDate: { type: DataTypes.DATEONLY, allowNull: false },
    completedDate: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.ENUM("scheduled", "completed", "skipped", "overdue"),
      allowNull: false,
      defaultValue: "scheduled"
    },
    metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }
  },
  { tableName: "enterprise_activities", timestamps: true }
);

const EnterpriseResource = sequelize.define(
  "EnterpriseResource",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    resourceType: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(14, 3), allowNull: false, defaultValue: 0 },
    cost: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    recordedAt: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW }
  },
  { tableName: "enterprise_resources", timestamps: true }
);

const EnterpriseOutput = sequelize.define(
  "EnterpriseOutput",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    outputType: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(14, 3), allowNull: false, defaultValue: 0 },
    revenue: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    recordedAt: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW }
  },
  { tableName: "enterprise_outputs", timestamps: true }
);

const EnterpriseContract = sequelize.define(
  "EnterpriseContract",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    buyerName: { type: DataTypes.STRING, allowNull: false },
    outputType: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
    unitPriceKes: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    deliveryDate: { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.ENUM("draft", "active", "delivered", "paid", "disputed"),
      allowNull: false,
      defaultValue: "active"
    },
    settlementReference: { type: DataTypes.STRING, allowNull: true }
  },
  { tableName: "enterprise_contracts", timestamps: true }
);

User.hasMany(Farm, { foreignKey: "userId", as: "farms", onDelete: "CASCADE" });
Farm.belongsTo(User, { foreignKey: "userId", as: "owner" });

Farm.hasMany(Plot, { foreignKey: "farmId", as: "plots", onDelete: "CASCADE" });
Plot.belongsTo(Farm, { foreignKey: "farmId" });

Farm.hasMany(Activity, { foreignKey: "farmId", as: "activities", onDelete: "CASCADE" });
Activity.belongsTo(Farm, { foreignKey: "farmId" });
Plot.hasMany(Activity, { foreignKey: "plotId", as: "activities", onDelete: "SET NULL" });
Activity.belongsTo(Plot, { foreignKey: "plotId" });

Farm.hasMany(Expense, { foreignKey: "farmId", as: "expenses", onDelete: "CASCADE" });
Expense.belongsTo(Farm, { foreignKey: "farmId" });
Plot.hasMany(Expense, { foreignKey: "plotId", as: "expenses", onDelete: "SET NULL" });
Expense.belongsTo(Plot, { foreignKey: "plotId" });

Farm.hasMany(Harvest, { foreignKey: "farmId", as: "harvests", onDelete: "CASCADE" });
Harvest.belongsTo(Farm, { foreignKey: "farmId" });
Plot.hasMany(Harvest, { foreignKey: "plotId", as: "harvests", onDelete: "SET NULL" });
Harvest.belongsTo(Plot, { foreignKey: "plotId" });

Farm.hasMany(Sale, { foreignKey: "farmId", as: "sales", onDelete: "CASCADE" });
Sale.belongsTo(Farm, { foreignKey: "farmId" });
Harvest.hasMany(Sale, { foreignKey: "harvestId", as: "sales", onDelete: "SET NULL" });
Sale.belongsTo(Harvest, { foreignKey: "harvestId" });

Farm.hasMany(MarketplaceListing, {
  foreignKey: "farmId",
  as: "marketplaceListings",
  onDelete: "CASCADE"
});
MarketplaceListing.belongsTo(Farm, { foreignKey: "farmId" });

User.hasMany(MarketplaceOrder, {
  foreignKey: "buyerUserId",
  as: "marketplaceOrders",
  onDelete: "CASCADE"
});
MarketplaceOrder.belongsTo(User, { foreignKey: "buyerUserId", as: "buyer" });

MarketplaceListing.hasMany(MarketplaceOrder, {
  foreignKey: "listingId",
  as: "orders",
  onDelete: "CASCADE"
});
MarketplaceOrder.belongsTo(MarketplaceListing, { foreignKey: "listingId", as: "listing" });

User.hasMany(LoanApplication, {
  foreignKey: "userId",
  as: "loanApplications",
  onDelete: "CASCADE"
});
LoanApplication.belongsTo(User, { foreignKey: "userId" });

BillingPlan.hasMany(UserSubscription, {
  foreignKey: "billingPlanId",
  as: "subscriptions",
  onDelete: "SET NULL"
});
UserSubscription.belongsTo(BillingPlan, { foreignKey: "billingPlanId", as: "plan" });

User.hasMany(UserSubscription, {
  foreignKey: "userId",
  as: "subscriptions",
  onDelete: "CASCADE"
});
UserSubscription.belongsTo(User, { foreignKey: "userId" });

User.hasMany(PaymentTransaction, {
  foreignKey: "userId",
  as: "payments",
  onDelete: "CASCADE"
});
PaymentTransaction.belongsTo(User, { foreignKey: "userId" });

UserSubscription.hasMany(PaymentTransaction, {
  foreignKey: "userSubscriptionId",
  as: "payments",
  onDelete: "SET NULL"
});
PaymentTransaction.belongsTo(UserSubscription, { foreignKey: "userSubscriptionId", as: "subscription" });

User.hasMany(ProblemTicket, {
  foreignKey: "userId",
  as: "problemTickets",
  onDelete: "CASCADE"
});
ProblemTicket.belongsTo(User, { foreignKey: "userId" });

Farm.hasMany(ProblemTicket, {
  foreignKey: "farmId",
  as: "problemTickets",
  onDelete: "SET NULL"
});
ProblemTicket.belongsTo(Farm, { foreignKey: "farmId" });

PaymentTransaction.hasMany(ProblemTicket, {
  foreignKey: "paymentTransactionId",
  as: "tickets",
  onDelete: "SET NULL"
});
ProblemTicket.belongsTo(PaymentTransaction, { foreignKey: "paymentTransactionId", as: "payment" });

PaymentTransaction.hasMany(PaymentWebhookEvent, {
  foreignKey: "paymentTransactionId",
  as: "webhookEvents",
  onDelete: "SET NULL"
});
PaymentWebhookEvent.belongsTo(PaymentTransaction, { foreignKey: "paymentTransactionId", as: "transaction" });

Farm.hasMany(LoanApplication, {
  foreignKey: "farmId",
  as: "loanApplications",
  onDelete: "CASCADE"
});
LoanApplication.belongsTo(Farm, { foreignKey: "farmId" });

Farm.hasMany(CarbonPractice, {
  foreignKey: "farmId",
  as: "carbonPractices",
  onDelete: "CASCADE"
});
CarbonPractice.belongsTo(Farm, { foreignKey: "farmId" });

User.hasMany(CarbonCertificate, {
  foreignKey: "userId",
  as: "carbonCertificates",
  onDelete: "CASCADE"
});
CarbonCertificate.belongsTo(User, { foreignKey: "userId" });

Farm.hasMany(CarbonCertificate, {
  foreignKey: "farmId",
  as: "carbonCertificates",
  onDelete: "CASCADE"
});
CarbonCertificate.belongsTo(Farm, { foreignKey: "farmId" });

Farm.hasMany(TraceabilityBatch, {
  foreignKey: "farmId",
  as: "traceabilityBatches",
  onDelete: "CASCADE"
});
TraceabilityBatch.belongsTo(Farm, { foreignKey: "farmId" });

TraceabilityBatch.hasMany(TraceabilityEvent, {
  foreignKey: "batchId",
  as: "events",
  onDelete: "CASCADE"
});
TraceabilityEvent.belongsTo(TraceabilityBatch, { foreignKey: "batchId" });

Harvest.hasMany(TraceabilityBatch, {
  foreignKey: "harvestId",
  as: "traceabilityBatches",
  onDelete: "SET NULL"
});
TraceabilityBatch.belongsTo(Harvest, { foreignKey: "harvestId" });

Farm.hasMany(FarmScore, {
  foreignKey: "farmId",
  as: "scores",
  onDelete: "CASCADE"
});
FarmScore.belongsTo(Farm, { foreignKey: "farmId" });

Farm.hasMany(Enterprise, { foreignKey: "farmId", as: "enterprises", onDelete: "CASCADE" });
Enterprise.belongsTo(Farm, { foreignKey: "farmId" });

EnterpriseTemplate.hasMany(Enterprise, { foreignKey: "templateId", as: "instances", onDelete: "SET NULL" });
Enterprise.belongsTo(EnterpriseTemplate, { foreignKey: "templateId", as: "template" });

Enterprise.hasMany(EnterpriseActivity, { foreignKey: "enterpriseId", as: "activities", onDelete: "CASCADE" });
EnterpriseActivity.belongsTo(Enterprise, { foreignKey: "enterpriseId" });

Enterprise.hasMany(EnterpriseResource, { foreignKey: "enterpriseId", as: "resources", onDelete: "CASCADE" });
EnterpriseResource.belongsTo(Enterprise, { foreignKey: "enterpriseId" });

Enterprise.hasMany(EnterpriseOutput, { foreignKey: "enterpriseId", as: "outputs", onDelete: "CASCADE" });
EnterpriseOutput.belongsTo(Enterprise, { foreignKey: "enterpriseId" });

Enterprise.hasMany(EnterpriseContract, { foreignKey: "enterpriseId", as: "contracts", onDelete: "CASCADE" });
EnterpriseContract.belongsTo(Enterprise, { foreignKey: "enterpriseId" });

module.exports = {
  sequelize,
  User,
  Farm,
  Plot,
  Activity,
  Expense,
  Harvest,
  Sale,
  MarketplaceListing,
  MarketplaceOrder,
  LoanApplication,
  BillingPlan,
  UserSubscription,
  PaymentTransaction,
  PaymentWebhookEvent,
  ProblemTicket,
  CarbonPractice,
  CarbonCertificate,
  TraceabilityBatch,
  TraceabilityEvent,
  FarmScore,
  EnterpriseTemplate,
  Enterprise,
  EnterpriseActivity,
  EnterpriseResource,
  EnterpriseOutput,
  EnterpriseContract
};
