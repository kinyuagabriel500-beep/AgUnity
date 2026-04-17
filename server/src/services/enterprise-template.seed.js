const { EnterpriseTemplate } = require("../db/models");

const TEMPLATE_LIBRARY = [
  ["livestock", "dairy", "Dairy Farming"],
  ["livestock", "beef_cattle", "Beef Cattle"],
  ["livestock", "goat", "Goat Farming"],
  ["livestock", "sheep", "Sheep Farming"],
  ["livestock", "pig_farming", "Pig Farming"],
  ["livestock", "poultry_broilers", "Poultry Broilers"],
  ["livestock", "poultry_layers", "Poultry Layers"],
  ["livestock", "poultry_kienyeji", "Kienyeji Chicken"],
  ["aquaculture", "tilapia", "Fish Farming Tilapia"],
  ["aquaculture", "catfish", "Fish Farming Catfish"],
  ["crop", "maize", "Maize Farming"],
  ["crop", "rice", "Rice Farming"],
  ["crop", "wheat", "Wheat Farming"],
  ["crop", "potatoes", "Potato Farming"],
  ["crop", "beans", "Bean Farming"],
  ["horticulture", "avocado", "Avocado Farming"],
  ["horticulture", "mango", "Mango Farming"],
  ["horticulture", "banana", "Banana Farming"],
  ["horticulture", "vegetables", "Vegetable Farming"],
  ["tree_crop", "coconut", "Coconut Farming"],
  ["tree_crop", "coffee", "Coffee Farming"],
  ["tree_crop", "tea", "Tea Farming"],
  ["tree_crop", "macadamia", "Macadamia Farming"],
  ["specialized", "beekeeping", "Beekeeping"],
  ["specialized", "greenhouse", "Greenhouse Farming"],
  ["specialized", "hydroponics", "Hydroponics"],
];

const DEFAULT_CALENDARS = {
  dairy: [
    { task: "Milking", frequency: "daily", times: ["06:00", "18:00"] },
    { task: "Feeding", frequency: "daily", times: ["07:00", "17:00"] },
    { task: "Health Check", frequency: "weekly" },
  ],
  poultry_broilers: [
    { task: "Feeding", frequency: "daily", times: ["08:00", "16:00"] },
    { task: "Vaccination", day: 7 },
    { task: "Vaccination", day: 14 },
    { task: "Sale", day: 42 },
  ],
  rice: [
    { task: "Land Preparation", week: 1 },
    { task: "Transplanting", week: 2 },
    { task: "Fertilizer Application", week: 6 },
    { task: "Harvest", week: 12 },
  ],
  default: [
    { task: "Feeding or Input Planning", frequency: "daily" },
    { task: "Health and Quality Check", frequency: "weekly" },
  ],
};

const FALLBACK_INPUTS = ["labor", "water"];
const FALLBACK_OUTPUTS = ["produce"];

const buildTemplate = ([type, subtype, name]) => ({
  type,
  subtype,
  name,
  lifecycleStages: [],
  defaultCalendar: DEFAULT_CALENDARS[subtype] || DEFAULT_CALENDARS.default,
  requiredInputs: FALLBACK_INPUTS,
  expectedOutputs: FALLBACK_OUTPUTS,
  kpis: [],
  aiRules: [],
});

const seedEnterpriseTemplates = async () => {
  for (const tuple of TEMPLATE_LIBRARY) {
    const payload = buildTemplate(tuple);
    const existing = await EnterpriseTemplate.findOne({
      where: { type: payload.type, subtype: payload.subtype },
    });

    if (existing) {
      await existing.update(payload);
    } else {
      await EnterpriseTemplate.create(payload);
    }
  }
};

module.exports = { seedEnterpriseTemplates, TEMPLATE_LIBRARY };
