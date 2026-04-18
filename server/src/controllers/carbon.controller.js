const crypto = require("crypto");
const { z } = require("zod");
const { Farm, CarbonPractice, CarbonCertificate } = require("../db/models");
const { estimatePracticeCredits, summarizeCarbonForFarm } = require("../services/carbon-credit.service");

const trackPracticeSchema = z.object({
  farmId: z.string().uuid(),
  practiceType: z.enum(["no_till", "tree_planting", "organic_farming"]),
  value: z.coerce.number().positive(),
  unit: z.string().min(2).max(20),
  recordedAt: z.string(),
  notes: z.string().max(1000).optional()
});

const farmQuerySchema = z.object({
  farmId: z.string().uuid()
});

const trackPractice = async (req, res, next) => {
  try {
    const payload = trackPracticeSchema.parse(req.body);
    const farm = await Farm.findOne({ where: { id: payload.farmId, userId: req.user.id } });
    if (!farm) return res.status(404).json({ message: "Farm not found" });

    const practice = await CarbonPractice.create(payload);
    const estimatedCredits = estimatePracticeCredits(payload.practiceType, payload.value);

    res.status(201).json({
      practice,
      estimatedCredits: Number(estimatedCredits.toFixed(3))
    });
  } catch (error) {
    next(error);
  }
};

const getCarbonSummary = async (req, res, next) => {
  try {
    const query = farmQuerySchema.parse(req.query);
    const farm = await Farm.findOne({ where: { id: query.farmId, userId: req.user.id } });
    if (!farm) return res.status(404).json({ message: "Farm not found" });

    const summary = await summarizeCarbonForFarm(query.farmId);
    res.json({
      farmId: query.farmId,
      currency: "KES",
      totalCredits: summary.totalCredits,
      earningKes: summary.earningKes,
      marketRateKesPerCredit: summary.marketRateKesPerCredit,
      practices: summary.practices
    });
  } catch (error) {
    next(error);
  }
};

const generateCertificate = async (req, res, next) => {
  try {
    const query = farmQuerySchema.parse(req.query);
    const farm = await Farm.findOne({ where: { id: query.farmId, userId: req.user.id } });
    if (!farm) return res.status(404).json({ message: "Farm not found" });

    const summary = await summarizeCarbonForFarm(query.farmId);
    const certificateCode = `AGUNITY-CC-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const certificate = await CarbonCertificate.create({
      userId: req.user.id,
      farmId: query.farmId,
      certificateCode,
      totalCredits: summary.totalCredits,
      earningKes: summary.earningKes
    });

    res.status(201).json({
      certificateId: certificate.id,
      certificateCode: certificate.certificateCode,
      issuedAt: certificate.issuedAt,
      currency: "KES",
      totalCredits: summary.totalCredits,
      earningKes: summary.earningKes,
      message: "Carbon credit certificate generated successfully."
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  trackPractice,
  getCarbonSummary,
  generateCertificate
};
