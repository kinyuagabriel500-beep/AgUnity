const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  createListing,
  listAvailableProduce,
  placeOrder,
  priceDashboard,
  sellNow
} = require("../controllers/marketplace.controller");

const router = Router();

router.use(requireAuth);
router.post("/marketplace/listings", createListing);
router.get("/marketplace/listings", listAvailableProduce);
router.post("/marketplace/orders", placeOrder);
router.get("/marketplace/price-dashboard", priceDashboard);
router.post("/marketplace/sell-now", sellNow);

module.exports = router;
