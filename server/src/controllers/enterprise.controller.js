const { z } = require("zod");
const { Op } = require("sequelize");
const {
  Farm,
  Enterprise,
  EnterpriseTemplate,
  EnterpriseActivity,
  EnterpriseResource,
  EnterpriseOutput,
  EnterpriseContract,
} = require("../db/models");
const {
  aiEnterpriseCreate,
  aiEnterpriseGenerateCalendar,
  aiEnterprisePredictYield,
  aiEnterpriseOptimizeCosts,
  aiEnterpriseRecommendActions,
} = require("../integrations/ai.client");

const enterpriseCreateSchema = z.object({
  farmId: z.string().uuid(),
  type: z.string().min(2).max(80),
  subtype: z.string().min(2).max(120),
  name: z.string().min(2).max(140).optional(),
  startDate: z.string().optional(),
  scaleUnits: z.coerce.number().positive().default(1),
  scaleUnitLabel: z.string().min(1).max(40).default("units"),
  horizonDays: z.coerce.number().int().min(14).max(540).default(120),
});

const listSchema = z.object({ farmId: z.string().uuid() });
const enterpriseIdSchema = z.object({ enterpriseId: z.string().uuid() });
const enterpriseBodyIdSchema = z.object({ enterpriseId: z.string().uuid() });

const resourceSchema = z.object({
  resourceType: z.string().min(2).max(80),
  quantity: z.coerce.number().nonnegative().default(0),
  cost: z.coerce.number().nonnegative().default(0),
  recordedAt: z.string().optional(),
});

const outputSchema = z.object({
  outputType: z.string().min(2).max(80),
  quantity: z.coerce.number().nonnegative().default(0),
  revenue: z.coerce.number().nonnegative().default(0),
  recordedAt: z.string().optional(),
});

const contractSchema = z.object({
  buyerName: z.string().min(2).max(140),
  outputType: z.string().min(2).max(80),
  quantity: z.coerce.number().positive(),
  unitPriceKes: z.coerce.number().positive(),
  deliveryDate: z.string(),
  status: z.enum(["draft", "active", "delivered", "paid", "disputed"]).optional(),
  settlementReference: z.string().max(120).optional(),
});

const contractStatusSchema = z.object({
  status: z.enum(["draft", "active", "delivered", "paid", "disputed"]),
  settlementReference: z.string().max(120).optional(),
});

const contractIdSchema = z.object({ contractId: z.string().uuid() });

const toDateOnly = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const ensureUserEnterprise = async (userId, enterpriseId) => {
  return Enterprise.findOne({
    where: { id: enterpriseId },
    include: [{ model: Farm, where: { userId }, attributes: ["id", "name", "location"] }],
  });
};

const createEnterprise = async (req, res, next) => {
  try {
    const payload = enterpriseCreateSchema.parse(req.body);
    const farm = await Farm.findOne({ where: { id: payload.farmId, userId: req.user.id } });
    if (!farm) return res.status(404).json({ message: "Farm not found" });

    const type = payload.type.toLowerCase();
    const subtype = payload.subtype.toLowerCase();
    const template = await EnterpriseTemplate.findOne({ where: { type, subtype } });
    if (!template) return res.status(404).json({ message: "Enterprise template not found" });

    const startDate = toDateOnly(payload.startDate);
    const enterprise = await Enterprise.create({
      farmId: farm.id,
      templateId: template.id,
      name: payload.name || `${template.name} - ${farm.name}`,
      type,
      subtype,
      startDate,
      scaleUnits: payload.scaleUnits,
      scaleUnitLabel: payload.scaleUnitLabel,
      status: "active",
    });

    const aiCalendar = await aiEnterpriseGenerateCalendar({
      type,
      subtype,
      start_date: startDate,
      scale_units: payload.scaleUnits,
      horizon_days: payload.horizonDays,
      template: {
        default_calendar: template.defaultCalendar,
      },
    });

    const tasks = Array.isArray(aiCalendar?.items) ? aiCalendar.items : [];
    if (tasks.length) {
      await EnterpriseActivity.bulkCreate(
        tasks.map((task) => ({
          enterpriseId: enterprise.id,
          activityType: task.activity_type || "Task",
          scheduledDate: toDateOnly(task.scheduled_date),
          status: task.status || "scheduled",
          metadata: task.meta || {},
        }))
      );
    }

    return res.status(201).json({
      enterprise,
      seededActivities: tasks.length,
      message: "Enterprise created and calendar generated.",
    });
  } catch (error) {
    next(error);
  }
};

const listTemplates = async (_req, res, next) => {
  try {
    const items = await EnterpriseTemplate.findAll({ order: [["type", "ASC"], ["subtype", "ASC"]] });
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

const listEnterprises = async (req, res, next) => {
  try {
    const query = listSchema.parse(req.query);
    const farm = await Farm.findOne({ where: { id: query.farmId, userId: req.user.id } });
    if (!farm) return res.status(404).json({ message: "Farm not found" });

    const items = await Enterprise.findAll({
      where: { farmId: query.farmId },
      include: [{ model: EnterpriseTemplate, as: "template" }],
      order: [["createdAt", "DESC"]],
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

const regenerateCalendar = async (req, res, next) => {
  try {
    const params = enterpriseIdSchema.parse(req.params);
    const enterprise = await ensureUserEnterprise(req.user.id, params.enterpriseId);
    if (!enterprise) return res.status(404).json({ message: "Enterprise not found" });

    const template = await EnterpriseTemplate.findByPk(enterprise.templateId);
    const calendarPayload = await aiEnterpriseGenerateCalendar({
      type: enterprise.type,
      subtype: enterprise.subtype,
      start_date: toDateOnly(enterprise.startDate),
      scale_units: Number(enterprise.scaleUnits || 1),
      horizon_days: 120,
      template: { default_calendar: template?.defaultCalendar || [] },
    });

    const items = Array.isArray(calendarPayload?.items) ? calendarPayload.items : [];
    await EnterpriseActivity.destroy({
      where: {
        enterpriseId: enterprise.id,
        status: "scheduled",
        scheduledDate: { [Op.gte]: new Date().toISOString().slice(0, 10) },
      },
    });

    if (items.length) {
      await EnterpriseActivity.bulkCreate(
        items.map((task) => ({
          enterpriseId: enterprise.id,
          activityType: task.activity_type || "Task",
          scheduledDate: toDateOnly(task.scheduled_date),
          status: "scheduled",
          metadata: task.meta || {},
        }))
      );
    }

    res.json({ message: "Calendar regenerated", itemsCount: items.length });
  } catch (error) {
    next(error);
  }
};

const getCalendar = async (req, res, next) => {
  try {
    const params = enterpriseIdSchema.parse(req.params);
    const enterprise = await ensureUserEnterprise(req.user.id, params.enterpriseId);
    if (!enterprise) return res.status(404).json({ message: "Enterprise not found" });

    const items = await EnterpriseActivity.findAll({
      where: { enterpriseId: enterprise.id },
      order: [["scheduledDate", "ASC"]],
      limit: 300,
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

const addResource = async (req, res, next) => {
  try {
    const params = enterpriseIdSchema.parse(req.params);
    const payload = resourceSchema.parse(req.body);
    const enterprise = await ensureUserEnterprise(req.user.id, params.enterpriseId);
    if (!enterprise) return res.status(404).json({ message: "Enterprise not found" });

    const item = await EnterpriseResource.create({
      enterpriseId: enterprise.id,
      resourceType: payload.resourceType,
      quantity: payload.quantity,
      cost: payload.cost,
      recordedAt: toDateOnly(payload.recordedAt),
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const addOutput = async (req, res, next) => {
  try {
    const params = enterpriseIdSchema.parse(req.params);
    const payload = outputSchema.parse(req.body);
    const enterprise = await ensureUserEnterprise(req.user.id, params.enterpriseId);
    if (!enterprise) return res.status(404).json({ message: "Enterprise not found" });

    const item = await EnterpriseOutput.create({
      enterpriseId: enterprise.id,
      outputType: payload.outputType,
      quantity: payload.quantity,
      revenue: payload.revenue,
      recordedAt: toDateOnly(payload.recordedAt),
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const getEnterpriseFinancials = async (req, res, next) => {
  try {
    const params = enterpriseIdSchema.parse(req.params);
    const enterprise = await ensureUserEnterprise(req.user.id, params.enterpriseId);
    if (!enterprise) return res.status(404).json({ message: "Enterprise not found" });

    const [resources, outputs] = await Promise.all([
      EnterpriseResource.findAll({ where: { enterpriseId: enterprise.id } }),
      EnterpriseOutput.findAll({ where: { enterpriseId: enterprise.id } }),
    ]);

    const totalCost = resources.reduce((sum, row) => sum + Number(row.cost || 0), 0);
    const totalRevenue = outputs.reduce((sum, row) => sum + Number(row.revenue || 0), 0);

    res.json({
      enterpriseId: enterprise.id,
      enterpriseName: enterprise.name,
      totals: {
        cost: Number(totalCost.toFixed(2)),
        revenue: Number(totalRevenue.toFixed(2)),
        profit: Number((totalRevenue - totalCost).toFixed(2)),
      },
      resources,
      outputs,
    });
  } catch (error) {
    next(error);
  }
};

const predictYield = async (req, res, next) => {
  try {
    const params = enterpriseIdSchema.parse(req.params);
    const enterprise = await ensureUserEnterprise(req.user.id, params.enterpriseId);
    if (!enterprise) return res.status(404).json({ message: "Enterprise not found" });

    const prediction = await aiEnterprisePredictYield({
      type: enterprise.type,
      subtype: enterprise.subtype,
      scale_units: Number(enterprise.scaleUnits || 1),
      cycle_days: 120,
      output_unit: "units",
    });

    res.json(prediction || { predicted_output: 0, unit: "units", confidence: 0.4, drivers: [] });
  } catch (error) {
    next(error);
  }
};

const optimizeCosts = async (req, res, next) => {
  try {
    const params = enterpriseIdSchema.parse(req.params);
    const enterprise = await ensureUserEnterprise(req.user.id, params.enterpriseId);
    if (!enterprise) return res.status(404).json({ message: "Enterprise not found" });

    const resources = await EnterpriseResource.findAll({ where: { enterpriseId: enterprise.id } });
    const result = await aiEnterpriseOptimizeCosts({
      type: enterprise.type,
      subtype: enterprise.subtype,
      resources: resources.map((item) => ({
        resource_type: item.resourceType,
        quantity: Number(item.quantity || 0),
        cost: Number(item.cost || 0),
      })),
    });

    res.json(result || { total_cost: 0, target_savings: 0, recommendations: ["No cost insights available."] });
  } catch (error) {
    next(error);
  }
};

const recommendActions = async (req, res, next) => {
  try {
    const params = enterpriseIdSchema.parse(req.params);
    const enterprise = await ensureUserEnterprise(req.user.id, params.enterpriseId);
    if (!enterprise) return res.status(404).json({ message: "Enterprise not found" });

    const upcoming = await EnterpriseActivity.findAll({
      where: {
        enterpriseId: enterprise.id,
        status: "scheduled",
        scheduledDate: { [Op.gte]: new Date().toISOString().slice(0, 10) },
      },
      order: [["scheduledDate", "ASC"]],
      limit: 10,
    });

    const result = await aiEnterpriseRecommendActions({
      type: enterprise.type,
      subtype: enterprise.subtype,
      upcoming_tasks: upcoming.map((item) => ({
        activity_type: item.activityType,
        scheduled_date: item.scheduledDate,
      })),
    });

    res.json(result || { actions: [], decision_summary: "No recommendations available right now." });
  } catch (error) {
    next(error);
  }
};

const createContract = async (req, res, next) => {
  try {
    const params = enterpriseIdSchema.parse(req.params);
    const payload = contractSchema.parse(req.body);
    const enterprise = await ensureUserEnterprise(req.user.id, params.enterpriseId);
    if (!enterprise) return res.status(404).json({ message: "Enterprise not found" });

    const contract = await EnterpriseContract.create({
      enterpriseId: enterprise.id,
      buyerName: payload.buyerName,
      outputType: payload.outputType,
      quantity: payload.quantity,
      unitPriceKes: payload.unitPriceKes,
      deliveryDate: toDateOnly(payload.deliveryDate),
      status: payload.status || "active",
      settlementReference: payload.settlementReference || null,
    });

    res.status(201).json(contract);
  } catch (error) {
    next(error);
  }
};

const listContracts = async (req, res, next) => {
  try {
    const params = enterpriseIdSchema.parse(req.params);
    const enterprise = await ensureUserEnterprise(req.user.id, params.enterpriseId);
    if (!enterprise) return res.status(404).json({ message: "Enterprise not found" });

    const items = await EnterpriseContract.findAll({
      where: { enterpriseId: enterprise.id },
      order: [["createdAt", "DESC"]],
    });

    res.json({ items });
  } catch (error) {
    next(error);
  }
};

const listRoleContracts = async (req, res, next) => {
  try {
    const currentRole = String(req.user.role || "").toLowerCase();
    if (!["buyer", "retailer", "admin"].includes(currentRole)) {
      return res.status(403).json({ message: "Forbidden: role cannot access contracts" });
    }

    const items = await EnterpriseContract.findAll({
      include: [
        {
          model: Enterprise,
          attributes: ["id", "name", "type", "subtype"],
          include: [{ model: Farm, attributes: ["id", "name", "location", "userId"] }],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 200,
    });

    const filtered = items.filter((item) => {
      if (currentRole === "admin") return true;
      if (currentRole === "retailer") return item.status === "active" || item.status === "delivered";
      if (currentRole === "buyer") {
        const buyerName = String(item.buyerName || "").trim().toLowerCase();
        const userFullName = String(req.user.fullName || "").trim().toLowerCase();
        return !buyerName || buyerName === userFullName;
      }
      return false;
    });

    res.json({ items: filtered });
  } catch (error) {
    next(error);
  }
};

const updateContractStatus = async (req, res, next) => {
  try {
    const params = contractIdSchema.parse(req.params);
    const payload = contractStatusSchema.parse(req.body);
    const contract = await EnterpriseContract.findByPk(params.contractId, {
      include: [{
        model: Enterprise,
        include: [{ model: Farm, attributes: ["id", "userId"] }],
      }],
    });

    if (!contract) return res.status(404).json({ message: "Contract not found" });

    const currentRole = String(req.user.role || "").toLowerCase();
    const canUpdateAsOwner = contract.Enterprise?.Farm?.userId === req.user.id;

    if (currentRole === "admin") {
      // Admin can transition contracts across all states.
    } else if (currentRole === "retailer") {
      if (!(canUpdateAsOwner && ["active", "delivered"].includes(payload.status))) {
        return res.status(403).json({ message: "Retailer can only mark owned contracts as active or delivered" });
      }
    } else if (currentRole === "buyer") {
      const buyerName = String(contract.buyerName || "").trim().toLowerCase();
      const userFullName = String(req.user.fullName || "").trim().toLowerCase();
      if (!(buyerName && buyerName === userFullName && ["paid", "disputed"].includes(payload.status))) {
        return res.status(403).json({ message: "Buyer can only mark assigned contracts as paid or disputed" });
      }
    } else {
      return res.status(403).json({ message: "Forbidden: role cannot update contract status" });
    }

    contract.status = payload.status;
    if (payload.settlementReference !== undefined) {
      contract.settlementReference = payload.settlementReference || null;
    }
    await contract.save();

    res.json(contract);
  } catch (error) {
    next(error);
  }
};

const withBodyEnterpriseId = async (req, res, next, handler) => {
  try {
    const payload = enterpriseBodyIdSchema.parse(req.body || {});
    req.params.enterpriseId = payload.enterpriseId;
    return handler(req, res, next);
  } catch (error) {
    return next(error);
  }
};

const generateCalendar = async (req, res, next) => withBodyEnterpriseId(req, res, next, regenerateCalendar);
const predictYieldByBody = async (req, res, next) => withBodyEnterpriseId(req, res, next, predictYield);
const optimizeCostsByBody = async (req, res, next) => withBodyEnterpriseId(req, res, next, optimizeCosts);
const recommendActionsByBody = async (req, res, next) => withBodyEnterpriseId(req, res, next, recommendActions);

const createEnterpriseBlueprint = async (req, res, next) => {
  try {
    const payload = enterpriseCreateSchema.parse(req.body);
    const result = await aiEnterpriseCreate({
      type: payload.type.toLowerCase(),
      subtype: payload.subtype.toLowerCase(),
      start_date: toDateOnly(payload.startDate),
      scale_units: payload.scaleUnits,
      horizon_days: payload.horizonDays,
    });
    res.json(result || { found: false, message: "Unable to generate blueprint now." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEnterprise,
  createEnterpriseBlueprint,
  listTemplates,
  listEnterprises,
  generateCalendar,
  regenerateCalendar,
  getCalendar,
  addResource,
  addOutput,
  getEnterpriseFinancials,
  predictYield,
  predictYieldByBody,
  optimizeCosts,
  optimizeCostsByBody,
  recommendActions,
  recommendActionsByBody,
  createContract,
  listContracts,
  listRoleContracts,
  updateContractStatus,
};
