const { z } = require("zod");
const { Farm, Harvest, Sale, MarketplaceListing, MarketplaceOrder, TraceabilityBatch, TraceabilityEvent } = require("../db/models");
const { buildBatchCode, createTraceabilityArtifacts, anchorWorkflowEvent } = require("../services/traceability.service");

const metadataSchema = z
  .unknown()
  .optional()
  .refine(
    (value) => value === undefined || (typeof value === "object" && value !== null && !Array.isArray(value)),
    { message: "metadata must be an object" }
  );

const createBatchSchema = z.object({
  farmId: z.string().uuid(),
  harvestId: z.string().uuid().optional(),
  batchCode: z.string().min(6).max(60).optional(),
  crop: z.string().min(2),
  quantityKg: z.coerce.number().positive(),
  producedAt: z.string(),
  metadata: metadataSchema,
  supplyChainStage: z.enum(["farm", "transporter", "warehouse", "retailer", "consumer"]).optional(),
  transporterName: z.string().optional(),
  warehouseName: z.string().optional(),
  retailerName: z.string().optional(),
  consumerNote: z.string().optional(),
  fileName: z.string().optional(),
  fileContentBase64: z.string().optional()
});

const workflowSchema = z.object({
  eventType: z.enum(["handoff", "received", "listed", "verified", "settled", "disputed"]),
  note: z.string().max(1000).optional(),
  metadata: metadataSchema,
  settlementReference: z.string().max(120).optional(),
  paymentReference: z.string().max(120).optional(),
  settlementPriceKes: z.coerce.number().positive().optional(),
  buyerName: z.string().min(2).optional()
});

const stageOrder = ["farm", "transporter", "warehouse", "retailer", "consumer", "settled"];

const stageByEvent = {
  handoff: "transporter",
  received: "warehouse",
  listed: "retailer",
  verified: "consumer",
  settled: "settled",
  disputed: "consumer"
};

const allowedRolesByEvent = {
  handoff: ["farmer", "transporter", "admin"],
  received: ["transporter", "warehouse", "admin"],
  listed: ["retailer", "admin"],
  verified: ["warehouse", "retailer", "consumer", "admin"],
  settled: ["retailer", "admin"],
  disputed: ["consumer", "retailer", "admin"]
};

const listSchema = z.object({
  farmId: z.string().uuid()
});

const createBatch = async (req, res, next) => {
  try {
    const payload = createBatchSchema.parse(req.body);
    const farm = await Farm.findOne({ where: { id: payload.farmId, userId: req.user.id } });
    if (!farm) return res.status(404).json({ message: "Farm not found" });

    if (payload.harvestId) {
      const harvest = await Harvest.findOne({ where: { id: payload.harvestId, farmId: payload.farmId } });
      if (!harvest) return res.status(404).json({ message: "Harvest not found for farm" });
    }

    const batchCode = payload.batchCode || buildBatchCode(payload.farmId);
    const artifacts = await createTraceabilityArtifacts({ ...payload, batchCode });

    const batch = await TraceabilityBatch.create({
      farmId: payload.farmId,
      harvestId: payload.harvestId || null,
      batchCode,
      crop: payload.crop,
      quantityKg: payload.quantityKg,
      producedAt: payload.producedAt,
      metadata: payload.metadata || {},
      supplyChainStage: payload.supplyChainStage || "farm",
      transporterName: payload.transporterName || null,
      warehouseName: payload.warehouseName || null,
      retailerName: payload.retailerName || null,
      consumerNote: payload.consumerNote || null,
      ...artifacts
    });

    await TraceabilityEvent.create({
      batchId: batch.id,
      eventType: "created",
      actorRole: req.user.role,
      actorName: req.user.fullName,
      note: "Batch created from farm record.",
      dataHash: batch.dataHash,
      txHash: batch.polygonTxHash,
      verificationStatus: batch.verificationStatus,
      metadata: payload.metadata || {}
    });

    res.status(201).json(batch);
  } catch (error) {
    next(error);
  }
};

const listBatches = async (req, res, next) => {
  try {
    const query = listSchema.parse(req.query);
    const farm = await Farm.findOne({ where: { id: query.farmId, userId: req.user.id } });
    if (!farm) return res.status(404).json({ message: "Farm not found" });

    const items = await TraceabilityBatch.findAll({
      where: { farmId: query.farmId },
      order: [["createdAt", "DESC"]]
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

const getBatchByCode = async (req, res, next) => {
  try {
    const { batchCode } = req.params;
    const batch = await TraceabilityBatch.findOne({ where: { batchCode } });
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    res.json(batch);
  } catch (error) {
    next(error);
  }
};

const getSupplyChainJourney = async (req, res, next) => {
  try {
    const { batchCode } = req.params;
    const batch = await TraceabilityBatch.findOne({
      where: { batchCode },
      include: [
        { model: Farm, attributes: ["name", "location", "county"] },
        { model: TraceabilityEvent, as: "events", order: [["createdAt", "ASC"]] }
      ]
    });

    if (!batch) return res.status(404).json({ message: "Batch not found" });

    const [latestSale, latestListing, latestOrder] = await Promise.all([
      Sale.findOne({ where: { farmId: batch.farmId, crop: batch.crop }, order: [["createdAt", "DESC"]] }),
      MarketplaceListing.findOne({ where: { farmId: batch.farmId, crop: batch.crop }, order: [["createdAt", "DESC"]] }),
      MarketplaceOrder.findOne({
        include: [{ model: MarketplaceListing, as: "listing", where: { farmId: batch.farmId, crop: batch.crop } }],
        order: [["createdAt", "DESC"]]
      })
    ]);

    res.json({
      batchCode: batch.batchCode,
      crop: batch.crop,
      quantityKg: batch.quantityKg,
      producedAt: batch.producedAt,
      supplyChainStage: batch.supplyChainStage,
      currentStage: batch.currentStage,
      settlementStatus: batch.settlementStatus,
      verifiedAt: batch.verifiedAt,
      settledAt: batch.settledAt,
      settlementReference: batch.settlementReference,
      farm: batch.Farm ? batch.Farm.get({ plain: true }) : null,
      stakeholders: {
        farmer: batch.Farm
          ? {
              name: batch.Farm.name,
              location: batch.Farm.location,
              county: batch.Farm.county
            }
          : null,
        transporter: batch.transporterName ? { name: batch.transporterName } : null,
        warehouse: batch.warehouseName ? { name: batch.warehouseName } : null,
        retailer: batch.retailerName ? { name: batch.retailerName } : null,
        consumer: batch.consumerNote ? { note: batch.consumerNote } : null
      },
      commerce: {
        latestSale: latestSale
          ? {
              buyerName: latestSale.buyerName,
              unitPriceKes: latestSale.unitPriceKes,
              paymentStatus: latestSale.paymentStatus,
              paymentReference: latestSale.paymentReference,
              paymentVerifiedAt: latestSale.paymentVerifiedAt,
              settlementTxHash: latestSale.settlementTxHash
            }
          : null,
        latestListing: latestListing
          ? {
              pricePerKgKes: latestListing.pricePerKgKes,
              status: latestListing.status,
              quantityKg: latestListing.quantityKg
            }
          : null,
        latestOrder: latestOrder
          ? {
              quantityKg: latestOrder.quantityKg,
              offeredPricePerKgKes: latestOrder.offeredPricePerKgKes,
              status: latestOrder.status
            }
          : null
      },
      ledger: {
        dataHash: batch.dataHash,
        ipfsCid: batch.ipfsCid,
        ipfsUrl: batch.ipfsUrl,
        polygonTxHash: batch.polygonTxHash,
        verificationStatus: batch.verificationStatus,
        qrCodeDataUrl: batch.qrCodeDataUrl
      },
      timeline: [...(batch.events || [])]
        .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
        .map((event) => ({
          stage: event.eventType,
          status: event.verificationStatus,
          label: event.note || event.eventType,
          actorRole: event.actorRole,
          txHash: event.txHash,
          createdAt: event.createdAt
        })),
      workflow: {
        nextAllowedStage: batch.currentStage === "settled"
          ? null
          : stageOrder[Math.min(stageOrder.indexOf(batch.currentStage) + 1, stageOrder.length - 1)]
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateWorkflow = async (req, res, next) => {
  try {
    const { batchCode } = req.params;
    const payload = workflowSchema.parse(req.body);

    const batch = await TraceabilityBatch.findOne({
      where: { batchCode },
      include: [{ model: Farm, attributes: ["name", "location", "county"] }]
    });
    if (!batch) return res.status(404).json({ message: "Batch not found" });

    const currentRole = String(req.user.role || "").toLowerCase();
    if (!allowedRolesByEvent[payload.eventType].includes(currentRole)) {
      return res.status(403).json({ message: "Forbidden: role cannot perform this workflow step" });
    }

    const expectedStage = stageByEvent[payload.eventType];
    const currentStageIndex = stageOrder.indexOf(batch.currentStage);
    const expectedStageIndex = stageOrder.indexOf(expectedStage);
    if (expectedStageIndex > currentStageIndex + 1 && currentRole !== "admin") {
      return res.status(400).json({ message: "Workflow step out of order" });
    }

    if (payload.eventType === "settled" && !payload.settlementPriceKes) {
      return res.status(400).json({ message: "Settlement price is required to mark a batch as settled" });
    }

    const eventPayload = {
      batchCode: batch.batchCode,
      eventType: payload.eventType,
      note: payload.note || "Workflow step recorded.",
      actorRole: currentRole,
      actorName: req.user.fullName,
      metadata: payload.metadata || {},
      settlementReference: payload.settlementReference || null,
      paymentReference: payload.paymentReference || null,
      settlementPriceKes: payload.settlementPriceKes || null
    };
    const anchored = await anchorWorkflowEvent(eventPayload);

    batch.currentStage = expectedStage;
    batch.supplyChainStage = expectedStage;
    if (payload.eventType === "verified") {
      batch.settlementStatus = "verified";
      batch.verifiedAt = new Date();
    }
    if (payload.eventType === "settled") {
      batch.settlementStatus = "settled";
      batch.settledAt = new Date();
      batch.settlementReference = payload.settlementReference || anchored.polygonTxHash;
    }
    if (payload.eventType === "listed") {
      batch.currentStage = "retailer";
    }
    if (payload.eventType === "disputed") {
      batch.settlementStatus = "disputed";
    }
    await batch.save();

    const event = await TraceabilityEvent.create({
      batchId: batch.id,
      eventType: payload.eventType,
      actorRole: currentRole,
      actorName: req.user.fullName,
      note: payload.note || "Workflow step recorded.",
      dataHash: anchored.dataHash,
      txHash: anchored.polygonTxHash,
      verificationStatus: anchored.verificationStatus,
      metadata: payload.metadata || {}
    });

    let settlementSale = null;
    if (payload.eventType === "settled") {
      const priceKes = payload.settlementPriceKes;
      const latestSale = await Sale.findOne({
        where: { batchCode: batch.batchCode },
        order: [["createdAt", "DESC"]]
      });

      if (latestSale) {
        latestSale.paymentStatus = "paid";
        latestSale.paymentReference = payload.paymentReference || payload.settlementReference || anchored.polygonTxHash;
        latestSale.paymentVerifiedAt = new Date();
        latestSale.settlementTxHash = anchored.polygonTxHash;
        if (payload.buyerName) {
          latestSale.buyerName = payload.buyerName;
        }
        latestSale.unitPriceKes = priceKes;
        await latestSale.save();
        settlementSale = latestSale;
      } else {
        settlementSale = await Sale.create({
          batchCode: batch.batchCode,
          farmId: batch.farmId,
          crop: batch.crop,
          buyerName: payload.buyerName || batch.retailerName || "Retailer settlement",
          quantityKg: batch.quantityKg,
          unitPriceKes: priceKes,
          saleDate: new Date().toISOString().slice(0, 10),
          paymentStatus: "paid",
          paymentReference: payload.paymentReference || payload.settlementReference || anchored.polygonTxHash,
          paymentVerifiedAt: new Date(),
          settlementTxHash: anchored.polygonTxHash
        });
      }
    }

    res.status(201).json({
      message: "Workflow step recorded",
      event,
      batch,
      settlementSale
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createBatch, listBatches, getBatchByCode, getSupplyChainJourney, updateWorkflow };
