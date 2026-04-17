const { z } = require("zod");
const { Farm, LoanApplication } = require("../db/models");
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
          ? "Auto-approved by UFIP baseline credit policy."
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

module.exports = {
  getCreditScore,
  applyForLoan
};
