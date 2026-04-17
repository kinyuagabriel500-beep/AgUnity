const { z } = require("zod");
const { Farm, Plot, Activity, Expense } = require("../db/models");

const onboardingSchema = z.object({
  name: z.string().min(2),
  location: z.string().min(2),
  country: z.string().min(2).max(120).optional(),
  county: z.string().max(120).optional(),
  locationLatitude: z.coerce.number().optional(),
  locationLongitude: z.coerce.number().optional(),
  locationAccuracyMeters: z.coerce.number().optional(),
  locationSource: z.string().max(80).optional(),
  acreageHectares: z.coerce.number().min(0).optional(),
  crop: z.string().min(2).optional(),
  season: z.string().min(2).optional(),
  firstActivityDate: z.string().optional(),
  firstExpense: z
    .object({
      category: z.string().min(2),
      amountKes: z.coerce.number().positive(),
      expenseDate: z.string(),
      notes: z.string().optional()
    })
    .optional(),
  firstPlannedActivity: z
    .object({
      type: z.enum(["planting", "spraying", "harvesting"]),
      date: z.string(),
      notes: z.string().optional(),
      costKes: z.coerce.number().min(0).default(0)
    })
    .optional()
});

const bootstrapFarmer = async (req, res, next) => {
  try {
    const payload = onboardingSchema.parse(req.body);

    const existingFarm = await Farm.findOne({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]]
    });

    if (existingFarm) {
      return res.json({
        created: false,
        farm: existingFarm,
        message: "Onboarding already completed for this account."
      });
    }

    const farm = await Farm.create({
      userId: req.user.id,
      name: payload.name,
      location: payload.location,
      country: payload.country || null,
      county: payload.county || null,
      locationLatitude: payload.locationLatitude ?? null,
      locationLongitude: payload.locationLongitude ?? null,
      locationAccuracyMeters: payload.locationAccuracyMeters ?? null,
      locationSource: payload.locationSource || null,
      acreageHectares: payload.acreageHectares || 0
    });

    const plot = await Plot.create({
      farmId: farm.id,
      name: "Main Plot",
      crop: payload.crop || null,
      season: payload.season || null,
      areaHectares: Math.max(Number(payload.acreageHectares || 0.5), 0.01)
    });

    const starterActivityPayload = payload.firstPlannedActivity
      ? {
          type: payload.firstPlannedActivity.type,
          date: payload.firstPlannedActivity.date,
          notes: payload.firstPlannedActivity.notes || "Starter planned activity from onboarding.",
          costKes: payload.firstPlannedActivity.costKes
        }
      : {
          type: "planting",
          date: payload.firstActivityDate || new Date().toISOString().slice(0, 10),
          notes: payload.crop
            ? `Starter record created for ${payload.crop} planning.`
            : "Starter record created during onboarding.",
          costKes: 0
        };

    const starterActivity = await Activity.create({
      farmId: farm.id,
      plotId: plot.id,
      ...starterActivityPayload
    });

    const starterExpense = payload.firstExpense
      ? await Expense.create({
          farmId: farm.id,
          plotId: plot.id,
          category: payload.firstExpense.category,
          amountKes: payload.firstExpense.amountKes,
          expenseDate: payload.firstExpense.expenseDate,
          notes: payload.firstExpense.notes || null
        })
      : null;

    return res.status(201).json({
      created: true,
      farm,
      plot,
      starterActivity,
      starterExpense,
      message: "Farmer onboarding completed successfully."
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { bootstrapFarmer };