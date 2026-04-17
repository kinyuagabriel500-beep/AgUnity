const { z } = require("zod");
const { fn, col } = require("sequelize");
const {
  Farm,
  Sale,
  MarketplaceListing,
  MarketplaceOrder
} = require("../db/models");

const createListingSchema = z.object({
  farmId: z.string().uuid(),
  crop: z.string().min(2),
  quantityKg: z.coerce.number().positive(),
  pricePerKgKes: z.coerce.number().positive()
});

const orderSchema = z.object({
  listingId: z.string().uuid(),
  quantityKg: z.coerce.number().positive(),
  offeredPricePerKgKes: z.coerce.number().positive()
});

const sellNowSchema = z.object({
  listingId: z.string().uuid(),
  quantityKg: z.coerce.number().positive(),
  buyerName: z.string().min(2),
  paymentStatus: z.enum(["pending", "paid", "partial"]).default("pending")
});

const createListing = async (req, res, next) => {
  try {
    const payload = createListingSchema.parse(req.body);
    const farm = await Farm.findOne({ where: { id: payload.farmId, userId: req.user.id } });
    if (!farm) return res.status(404).json({ message: "Farm not found" });

    const listing = await MarketplaceListing.create(payload);
    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
};

const listAvailableProduce = async (_req, res, next) => {
  try {
    const listings = await MarketplaceListing.findAll({
      where: { status: "active" },
      order: [["createdAt", "DESC"]]
    });
    res.json({ items: listings });
  } catch (error) {
    next(error);
  }
};

const placeOrder = async (req, res, next) => {
  try {
    const payload = orderSchema.parse(req.body);
    const listing = await MarketplaceListing.findByPk(payload.listingId);
    if (!listing || listing.status !== "active") {
      return res.status(404).json({ message: "Active listing not found" });
    }
    if (Number(payload.quantityKg) > Number(listing.quantityKg)) {
      return res.status(400).json({ message: "Requested quantity exceeds available stock" });
    }

    const order = await MarketplaceOrder.create({
      ...payload,
      buyerUserId: req.user.id,
      status: "pending"
    });
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

const sellNow = async (req, res, next) => {
  try {
    const payload = sellNowSchema.parse(req.body);
    const listing = await MarketplaceListing.findByPk(payload.listingId);
    if (!listing || listing.status !== "active") {
      return res.status(404).json({ message: "Active listing not found" });
    }

    const farm = await Farm.findOne({ where: { id: listing.farmId, userId: req.user.id } });
    if (!farm) return res.status(403).json({ message: "Only listing owner can sell now" });
    if (Number(payload.quantityKg) > Number(listing.quantityKg)) {
      return res.status(400).json({ message: "Requested quantity exceeds available stock" });
    }

    const sale = await Sale.create({
      farmId: listing.farmId,
      crop: listing.crop,
      buyerName: payload.buyerName,
      quantityKg: payload.quantityKg,
      unitPriceKes: listing.pricePerKgKes,
      saleDate: new Date().toISOString().slice(0, 10),
      paymentStatus: payload.paymentStatus
    });

    const remaining = Number(listing.quantityKg) - Number(payload.quantityKg);
    listing.quantityKg = remaining;
    listing.status = remaining <= 0 ? "sold" : "active";
    await listing.save();

    return res.status(201).json({
      message: "Sell Now executed",
      sale,
      listing
    });
  } catch (error) {
    next(error);
  }
};

const priceDashboard = async (_req, res, next) => {
  try {
    const saleStats = await Sale.findAll({
      attributes: [
        "crop",
        [fn("AVG", col("unitPriceKes")), "avgPriceKes"],
        [fn("SUM", col("quantityKg")), "totalVolumeKg"]
      ],
      group: ["crop"],
      order: [[fn("AVG", col("unitPriceKes")), "DESC"]]
    });

    const activeListings = await MarketplaceListing.findAll({
      where: { status: "active" },
      attributes: [
        "crop",
        [fn("AVG", col("pricePerKgKes")), "avgListingPriceKes"],
        [fn("SUM", col("quantityKg")), "availableVolumeKg"]
      ],
      group: ["crop"]
    });

    res.json({
      salesMarket: saleStats,
      listingMarket: activeListings
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createListing,
  listAvailableProduce,
  placeOrder,
  priceDashboard,
  sellNow
};
