const { z } = require("zod");
const { Farm, Plot } = require("../db/models");

const plotListSchema = z.object({
  farmId: z.string().uuid().optional()
});

const plotCreateSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().min(2).max(120),
  crop: z.string().max(120).optional().nullable(),
  season: z.string().max(120).optional().nullable(),
  areaHectares: z.coerce.number().positive(),
  soilType: z.string().max(120).optional().nullable()
});

const plotUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  crop: z.string().max(120).optional().nullable(),
  season: z.string().max(120).optional().nullable(),
  areaHectares: z.coerce.number().positive().optional(),
  soilType: z.string().max(120).optional().nullable()
});

const resolveOwnedFarm = async (farmId, userId) => {
  if (!farmId) {
    return Farm.findOne({ where: { userId }, order: [["createdAt", "DESC"]] });
  }

  return Farm.findOne({ where: { id: farmId, userId } });
};

const listPlots = async (req, res, next) => {
  try {
    const query = plotListSchema.parse(req.query);
    const farm = await resolveOwnedFarm(query.farmId, req.user.id);

    if (!farm) {
      return res.status(404).json({ message: "Farm not found" });
    }

    const plots = await Plot.findAll({
      where: { farmId: farm.id },
      order: [["createdAt", "DESC"]]
    });

    return res.json({ items: plots, farm });
  } catch (error) {
    next(error);
  }
};

const createPlot = async (req, res, next) => {
  try {
    const payload = plotCreateSchema.parse(req.body);
    const farm = await resolveOwnedFarm(payload.farmId, req.user.id);

    if (!farm) {
      return res.status(404).json({ message: "Farm not found" });
    }

    const plot = await Plot.create({
      farmId: farm.id,
      name: payload.name,
      crop: payload.crop || null,
      season: payload.season || null,
      areaHectares: payload.areaHectares,
      soilType: payload.soilType || null
    });

    return res.status(201).json(plot);
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "A plot with that name already exists for this farm." });
    }

    next(error);
  }
};

const updatePlot = async (req, res, next) => {
  try {
    const payload = plotUpdateSchema.parse(req.body);
    const plot = await Plot.findOne({
      where: { id: req.params.plotId },
      include: [{ model: Farm, where: { userId: req.user.id }, attributes: ["id"], required: true }]
    });

    if (!plot) {
      return res.status(404).json({ message: "Plot not found" });
    }

    await plot.update({
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.crop !== undefined ? { crop: payload.crop || null } : {}),
      ...(payload.season !== undefined ? { season: payload.season || null } : {}),
      ...(payload.areaHectares !== undefined ? { areaHectares: payload.areaHectares } : {}),
      ...(payload.soilType !== undefined ? { soilType: payload.soilType || null } : {})
    });

    return res.json(plot);
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "A plot with that name already exists for this farm." });
    }

    next(error);
  }
};

const deletePlot = async (req, res, next) => {
  try {
    const plot = await Plot.findOne({
      where: { id: req.params.plotId },
      include: [{ model: Farm, where: { userId: req.user.id }, attributes: ["id"], required: true }]
    });

    if (!plot) {
      return res.status(404).json({ message: "Plot not found" });
    }

    await plot.destroy();
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listPlots,
  createPlot,
  updatePlot,
  deletePlot
};