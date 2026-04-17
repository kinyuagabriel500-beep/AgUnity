const { z } = require("zod");
const { Farm, Activity, Expense, Harvest } = require("../db/models");

const farmSchema = z.object({
  name: z.string().min(2),
  location: z.string().min(2),
  country: z.string().max(120).optional(),
  county: z.string().max(120).optional(),
  locationLatitude: z.coerce.number().optional(),
  locationLongitude: z.coerce.number().optional(),
  locationAccuracyMeters: z.coerce.number().optional(),
  locationSource: z.string().max(80).optional()
});

const activitySchema = z.object({
  farmId: z.string().uuid(),
  type: z.enum(["planting", "spraying", "harvesting"]),
  date: z.string(),
  notes: z.string().optional(),
  costKes: z.coerce.number().min(0).default(0)
});

const expenseSchema = z.object({
  farmId: z.string().uuid(),
  category: z.string().min(2),
  amountKes: z.coerce.number().positive(),
  expenseDate: z.string(),
  notes: z.string().optional()
});

const harvestSchema = z.object({
  farmId: z.string().uuid(),
  crop: z.string().min(2),
  quantityKg: z.coerce.number().positive(),
  unitPriceKes: z.coerce.number().positive(),
  harvestDate: z.string()
});

const createFarm = async (req, res, next) => {
  try {
    const payload = farmSchema.parse(req.body);
    const farm = await Farm.create({ ...payload, userId: req.user.id });
    res.status(201).json(farm);
  } catch (error) {
    next(error);
  }
};

const listFarms = async (req, res, next) => {
  try {
    const farms = await Farm.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]]
    });
    res.json({ items: farms });
  } catch (error) {
    next(error);
  }
};

const listActivities = async (req, res, next) => {
  try {
    const { farmId } = req.query;
    const where = {};
    if (farmId) {
      const farm = await Farm.findOne({ where: { id: farmId, userId: req.user.id } });
      if (!farm) return res.status(404).json({ message: "Farm not found" });
      where.farmId = farmId;
    } else {
      const farms = await Farm.findAll({ where: { userId: req.user.id }, attributes: ["id"] });
      where.farmId = farms.map((f) => f.id);
    }

    const activities = await Activity.findAll({
      where,
      order: [["date", "DESC"]],
      limit: 20
    });
    res.json({ items: activities });
  } catch (error) {
    next(error);
  }
};

const createActivity = async (req, res, next) => {
  try {
    const payload = activitySchema.parse(req.body);
    const farm = await Farm.findOne({ where: { id: payload.farmId, userId: req.user.id } });
    if (!farm) return res.status(404).json({ message: "Farm not found" });
    const activity = await Activity.create(payload);
    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
};

const createExpense = async (req, res, next) => {
  try {
    const payload = expenseSchema.parse(req.body);
    const farm = await Farm.findOne({ where: { id: payload.farmId, userId: req.user.id } });
    if (!farm) return res.status(404).json({ message: "Farm not found" });
    const expense = await Expense.create(payload);
    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
};

const createHarvest = async (req, res, next) => {
  try {
    const payload = harvestSchema.parse(req.body);
    const farm = await Farm.findOne({ where: { id: payload.farmId, userId: req.user.id } });
    if (!farm) return res.status(404).json({ message: "Farm not found" });
    const harvest = await Harvest.create(payload);
    res.status(201).json(harvest);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listFarms,
  listActivities,
  createFarm,
  createActivity,
  createExpense,
  createHarvest
};
