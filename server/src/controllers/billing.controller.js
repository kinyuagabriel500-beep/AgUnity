const { z } = require("zod");
const { Op } = require("sequelize");
const {
  Farm,
  BillingPlan,
  UserSubscription,
  PaymentTransaction,
  ProblemTicket,
} = require("../db/models");

const subscribeSchema = z.object({
  planCode: z.string().min(2),
});

const ticketSchema = z.object({
  farmId: z.string().uuid().optional(),
  category: z.string().min(2).max(80),
  title: z.string().min(3).max(180),
  description: z.string().min(10).max(3000),
  urgency: z.enum(["low", "medium", "high"]).default("medium"),
});

const topupSchema = z.object({
  credits: z.coerce.number().int().min(5).max(5000),
});

const PAY_PER_TICKET_KES = 1500;

const listPlans = async (_req, res, next) => {
  try {
    const items = await BillingPlan.findAll({
      where: { isActive: true },
      order: [["priceKes", "ASC"]],
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

const getMySubscription = async (req, res, next) => {
  try {
    const item = await UserSubscription.findOne({
      where: { userId: req.user.id, status: { [Op.in]: ["trial", "active", "past_due"] } },
      include: [{ model: BillingPlan, as: "plan" }],
      order: [["createdAt", "DESC"]],
    });
    res.json({ item });
  } catch (error) {
    next(error);
  }
};

const subscribePlan = async (req, res, next) => {
  try {
    const payload = subscribeSchema.parse(req.body);
    const plan = await BillingPlan.findOne({ where: { code: payload.planCode, isActive: true } });
    if (!plan) return res.status(404).json({ message: "Billing plan not found" });

    await UserSubscription.update(
      { status: "cancelled", autoRenew: false },
      {
        where: {
          userId: req.user.id,
          status: { [Op.in]: ["trial", "active", "past_due"] },
        },
      }
    );

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const subscription = await UserSubscription.create({
      userId: req.user.id,
      billingPlanId: plan.id,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      autoRenew: true,
      advisoryCreditsRemaining: Number(plan.includedAdvisoryCredits || 0),
    });

    const payment = await PaymentTransaction.create({
      userId: req.user.id,
      userSubscriptionId: subscription.id,
      amountKes: plan.priceKes,
      status: "paid",
      provider: "railway-demo",
      providerReference: `SUB-${Date.now()}`,
      metadata: {
        planCode: plan.code,
        planName: plan.name,
      },
    });

    res.status(201).json({
      subscription,
      payment,
      message: `Subscribed to ${plan.name}.`,
    });
  } catch (error) {
    next(error);
  }
};

const topupCredits = async (req, res, next) => {
  try {
    const payload = topupSchema.parse(req.body);
    const subscription = await UserSubscription.findOne({
      where: { userId: req.user.id, status: { [Op.in]: ["trial", "active", "past_due"] } },
      order: [["createdAt", "DESC"]],
    });

    if (!subscription) return res.status(400).json({ message: "No active subscription. Subscribe first." });

    const amountKes = Number(payload.credits) * 30;
    subscription.advisoryCreditsRemaining = Number(subscription.advisoryCreditsRemaining || 0) + Number(payload.credits);
    await subscription.save();

    const payment = await PaymentTransaction.create({
      userId: req.user.id,
      userSubscriptionId: subscription.id,
      amountKes,
      status: "paid",
      provider: "railway-demo",
      providerReference: `TOPUP-${Date.now()}`,
      metadata: { credits: payload.credits },
    });

    res.status(201).json({
      creditsAdded: payload.credits,
      advisoryCreditsRemaining: subscription.advisoryCreditsRemaining,
      payment,
    });
  } catch (error) {
    next(error);
  }
};

const createProblemTicket = async (req, res, next) => {
  try {
    const payload = ticketSchema.parse(req.body);

    if (payload.farmId) {
      const farm = await Farm.findOne({ where: { id: payload.farmId, userId: req.user.id } });
      if (!farm) return res.status(404).json({ message: "Farm not found" });
    }

    const subscription = await UserSubscription.findOne({
      where: { userId: req.user.id, status: { [Op.in]: ["trial", "active", "past_due"] } },
      order: [["createdAt", "DESC"]],
    });

    let billedAmountKes = PAY_PER_TICKET_KES;
    let paymentTransactionId = null;
    let billingSource = "pay_per_ticket";

    if (subscription && Number(subscription.advisoryCreditsRemaining || 0) > 0) {
      subscription.advisoryCreditsRemaining = Number(subscription.advisoryCreditsRemaining) - 1;
      await subscription.save();
      billedAmountKes = 0;
      billingSource = "subscription_credit";
    } else {
      const payment = await PaymentTransaction.create({
        userId: req.user.id,
        userSubscriptionId: subscription?.id || null,
        amountKes: PAY_PER_TICKET_KES,
        status: "paid",
        provider: "railway-demo",
        providerReference: `CASE-${Date.now()}`,
        metadata: {
          category: payload.category,
          title: payload.title,
        },
      });
      paymentTransactionId = payment.id;
    }

    const ticket = await ProblemTicket.create({
      userId: req.user.id,
      farmId: payload.farmId || null,
      category: payload.category,
      title: payload.title,
      description: payload.description,
      urgency: payload.urgency,
      status: "open",
      billedAmountKes,
      paymentTransactionId,
    });

    res.status(201).json({
      ticket,
      billingSource,
      billedAmountKes,
      advisoryCreditsRemaining: subscription ? subscription.advisoryCreditsRemaining : 0,
    });
  } catch (error) {
    next(error);
  }
};

const listMyTickets = async (req, res, next) => {
  try {
    const items = await ProblemTicket.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
      limit: 200,
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

const getAdminBillingOverview = async (_req, res, next) => {
  try {
    const [plans, subscriptions, payments, tickets] = await Promise.all([
      BillingPlan.findAll({ where: { isActive: true } }),
      UserSubscription.findAll(),
      PaymentTransaction.findAll({ where: { status: "paid" } }),
      ProblemTicket.findAll(),
    ]);

    const monthlyRevenueKes = payments
      .filter((row) => new Date(row.createdAt).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000)
      .reduce((sum, row) => sum + Number(row.amountKes || 0), 0);

    const activeSubscriptions = subscriptions.filter((row) => row.status === "active").length;
    const openTickets = tickets.filter((row) => row.status === "open" || row.status === "in_progress").length;
    const resolvedTickets = tickets.filter((row) => row.status === "resolved" || row.status === "closed").length;

    const planMix = plans.map((plan) => ({
      planCode: plan.code,
      planName: plan.name,
      priceKes: Number(plan.priceKes),
      activeSubscriptions: subscriptions.filter((sub) => sub.billingPlanId === plan.id && sub.status === "active").length,
    }));

    res.json({
      metrics: {
        monthlyRevenueKes: Number(monthlyRevenueKes.toFixed(2)),
        totalPaidTransactions: payments.length,
        activeSubscriptions,
        openTickets,
        resolvedTickets,
      },
      planMix,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listPlans,
  getMySubscription,
  subscribePlan,
  topupCredits,
  createProblemTicket,
  listMyTickets,
  getAdminBillingOverview,
};
