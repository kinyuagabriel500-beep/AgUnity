const { BillingPlan } = require("../db/models");

const DEFAULT_PLANS = [
  {
    code: "starter",
    name: "Starter",
    description: "Smallholder growth plan with affordable advisory support.",
    priceKes: 2500,
    billingCycle: "monthly",
    includedTickets: 2,
    includedAdvisoryCredits: 20,
  },
  {
    code: "pro",
    name: "Pro",
    description: "Commercial farm operations with priority support and optimization tools.",
    priceKes: 9000,
    billingCycle: "monthly",
    includedTickets: 8,
    includedAdvisoryCredits: 120,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    description: "Multi-site agribusiness package with executive analytics and chain visibility.",
    priceKes: 35000,
    billingCycle: "monthly",
    includedTickets: 40,
    includedAdvisoryCredits: 600,
  },
];

const seedBillingPlans = async () => {
  for (const plan of DEFAULT_PLANS) {
    const existing = await BillingPlan.findOne({ where: { code: plan.code } });
    if (existing) {
      await existing.update({
        name: plan.name,
        description: plan.description,
        priceKes: plan.priceKes,
        billingCycle: plan.billingCycle,
        includedTickets: plan.includedTickets,
        includedAdvisoryCredits: plan.includedAdvisoryCredits,
        isActive: true,
      });
      continue;
    }

    await BillingPlan.create({
      code: plan.code,
      name: plan.name,
      description: plan.description,
      priceKes: plan.priceKes,
      billingCycle: plan.billingCycle,
      includedTickets: plan.includedTickets,
      includedAdvisoryCredits: plan.includedAdvisoryCredits,
      isActive: true,
    });
  }
};

module.exports = { seedBillingPlans };
