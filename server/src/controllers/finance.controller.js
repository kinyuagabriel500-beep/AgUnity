const { z } = require("zod");
const { Farm, LoanApplication, InsurancePolicy, InsuranceClaim } = require("../db/models");
const { calculateCreditScore } = require("../services/credit-score.service");

const scoreQuerySchema = z.object({
  farmId: z.string().uuid()
});

const loanApplicationSchema = z.object({
  farmId: z.string().uuid(),
  amountKes: z.coerce.number().min(1000),
  durationMonths: z.coerce.number().int().min(1).max(60),
  purpose: z.string().min(5).max(300)
});

const insuranceQuoteSchema = z.object({
  farmId: z.string().uuid(),
  coverAmountKes: z.coerce.number().min(1000),
  cropType: z.string().min(2).max(80).optional().default("mixed-crops"),
  seasonLabel: z.string().min(2).max(80).optional().default("current-season")
});

const insurancePolicySchema = insuranceQuoteSchema.extend({
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

const insuranceClaimSchema = z.object({
  policyId: z.string().uuid(),
  farmId: z.string().uuid(),
  incidentType: z.enum(["drought", "flood", "pest", "disease", "storm", "other"]),
  description: z.string().min(10).max(2000),
  incidentDate: z.string(),
  amountRequestedKes: z.coerce.number().min(100)
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const buildInsuranceQuote = async ({ userId, farmId, coverAmountKes, cropType, seasonLabel }) => {
  const farm = await Farm.findOne({ where: { id: farmId, userId } });
  if (!farm) {
    return { farm: null, quote: null };
  }

  const normalizedCover = Number(coverAmountKes);
  const acreage = Number(farm.acreageHectares || 0);
  const baseRate = 0.045;
  const acreageRisk = acreage > 8 ? 0.01 : acreage > 2 ? 0.006 : 0.003;
  const cropRisk = /rice|maize|tomato|banana/i.test(cropType) ? 0.008 : 0.005;
  const totalRate = clamp(baseRate + acreageRisk + cropRisk, 0.04, 0.12);
  const premiumKes = Math.round(normalizedCover * totalRate);

  return {
    farm,
    quote: {
      farmId,
      cropType,
      seasonLabel,
      coverAmountKes: normalizedCover,
      premiumKes,
      premiumRate: Number(totalRate.toFixed(4)),
      deductibleKes: Math.round(normalizedCover * 0.08),
      estimatedPayoutCapKes: Math.round(normalizedCover * 0.92)
    }
  };
};

const getCreditScore = async (req, res, next) => {
  try {
    const query = scoreQuerySchema.parse(req.query);
    const score = await calculateCreditScore(req.user.id, query.farmId);
    res.json({
      farmId: query.farmId,
      score: score.score,
      factors: score.factors,
      inputs: score.inputs
    });
  } catch (error) {
    next(error);
  }
};

const applyForLoan = async (req, res, next) => {
  try {
    const payload = loanApplicationSchema.parse(req.body);
    const farm = await Farm.findOne({ where: { id: payload.farmId, userId: req.user.id } });
    if (!farm) return res.status(404).json({ message: "Farm not found" });

    const credit = await calculateCreditScore(req.user.id, payload.farmId);
    const status = credit.score >= 65 ? "approved" : "pending";

    const application = await LoanApplication.create({
      userId: req.user.id,
      farmId: payload.farmId,
      amountKes: payload.amountKes,
      durationMonths: payload.durationMonths,
      purpose: payload.purpose,
      creditScoreSnapshot: credit.score,
      status,
      reviewerNote:
        status === "approved"
          ? "Auto-approved by AGUNITY baseline credit policy."
          : "Pending manual lending review due to current score threshold."
    });

    res.status(201).json({
      applicationId: application.id,
      status: application.status,
      creditScore: credit.score,
      recommendedMaxLoanKes: Math.round((credit.score / 100) * 500000)
    });
  } catch (error) {
    next(error);
  }
};

const getInsuranceQuote = async (req, res, next) => {
  try {
    const query = insuranceQuoteSchema.parse(req.query);
    const { farm, quote } = await buildInsuranceQuote({
      userId: req.user.id,
      farmId: query.farmId,
      coverAmountKes: query.coverAmountKes,
      cropType: query.cropType,
      seasonLabel: query.seasonLabel
    });

    if (!farm || !quote) {
      return res.status(404).json({ message: "Farm not found" });
    }

    return res.json({ quote });
  } catch (error) {
    next(error);
  }
};

const createInsurancePolicy = async (req, res, next) => {
  try {
    const payload = insurancePolicySchema.parse(req.body);
    const { farm, quote } = await buildInsuranceQuote({
      userId: req.user.id,
      farmId: payload.farmId,
      coverAmountKes: payload.coverAmountKes,
      cropType: payload.cropType,
      seasonLabel: payload.seasonLabel
    });

    if (!farm || !quote) {
      return res.status(404).json({ message: "Farm not found" });
    }

    const startDate = payload.startDate || new Date().toISOString().slice(0, 10);
    const endDate = payload.endDate || new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const policy = await InsurancePolicy.create({
      userId: req.user.id,
      farmId: payload.farmId,
      policyNumber: `AGI-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
      cropType: quote.cropType,
      coverAmountKes: quote.coverAmountKes,
      premiumKes: quote.premiumKes,
      seasonLabel: quote.seasonLabel,
      startDate,
      endDate,
      status: "active"
    });

    return res.status(201).json({
      policy,
      quote,
      message: "Insurance policy created."
    });
  } catch (error) {
    next(error);
  }
};

const listInsurancePolicies = async (req, res, next) => {
  try {
    const policies = await InsurancePolicy.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
      include: [{ model: InsuranceClaim, as: "claims" }]
    });

    return res.json({ items: policies });
  } catch (error) {
    next(error);
  }
};

const submitInsuranceClaim = async (req, res, next) => {
  try {
    const payload = insuranceClaimSchema.parse(req.body);
    const policy = await InsurancePolicy.findOne({
      where: { id: payload.policyId, userId: req.user.id, farmId: payload.farmId }
    });

    if (!policy) {
      return res.status(404).json({ message: "Insurance policy not found" });
    }

    const claim = await InsuranceClaim.create({
      policyId: policy.id,
      farmId: payload.farmId,
      incidentType: payload.incidentType,
      description: payload.description,
      incidentDate: payload.incidentDate,
      amountRequestedKes: payload.amountRequestedKes,
      status: "submitted",
      assessorNote: "Submitted for AGUNITY insurance review queue."
    });

    return res.status(201).json({
      claim,
      message: "Insurance claim submitted successfully."
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCreditScore,
  applyForLoan,
  getInsuranceQuote,
  createInsurancePolicy,
  listInsurancePolicies,
  submitInsuranceClaim
};
