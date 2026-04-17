const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const {
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
} = require("../controllers/enterprise.controller");

const router = Router();

router.use(requireAuth);
router.get("/enterprise/templates", listTemplates);
router.post("/enterprise/create", createEnterprise);
router.post("/enterprise/blueprint", createEnterpriseBlueprint);
router.get("/enterprise/list", listEnterprises);
router.post("/enterprise/generate-calendar", generateCalendar);
router.post("/enterprise/predict-yield", predictYieldByBody);
router.post("/enterprise/optimize-costs", optimizeCostsByBody);
router.post("/enterprise/recommend-actions", recommendActionsByBody);
router.post("/enterprise/:enterpriseId/generate-calendar", regenerateCalendar);
router.get("/enterprise/:enterpriseId/calendar", getCalendar);
router.post("/enterprise/:enterpriseId/resources", addResource);
router.post("/enterprise/:enterpriseId/outputs", addOutput);
router.get("/enterprise/:enterpriseId/financials", getEnterpriseFinancials);
router.post("/enterprise/:enterpriseId/predict-yield", predictYield);
router.post("/enterprise/:enterpriseId/optimize-costs", optimizeCosts);
router.post("/enterprise/:enterpriseId/recommend-actions", recommendActions);
router.post("/enterprise/:enterpriseId/contracts", createContract);
router.get("/enterprise/:enterpriseId/contracts", listContracts);
router.get("/enterprise/contracts", listRoleContracts);
router.patch("/enterprise/contracts/:contractId/status", updateContractStatus);

module.exports = router;
