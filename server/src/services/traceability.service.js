const crypto = require("crypto");
const QRCode = require("qrcode");
const env = require("../config/env");
const { uploadFileToIpfs } = require("../integrations/ipfs.client");
const { anchorHashOnPolygon } = require("../integrations/polygon.client");

const buildBatchCode = (farmId) => `BATCH-${farmId.slice(0, 6).toUpperCase()}-${Date.now()}`;

const hashBatchData = (payload) =>
  crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

const hashWorkflowEvent = (payload) =>
  crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

const createTraceabilityArtifacts = async (payload) => {
  const dataHash = hashBatchData(payload);

  const ipfsResult = await uploadFileToIpfs({
    fileName: payload.fileName || `${payload.batchCode}.json`,
    fileContentBase64:
      payload.fileContentBase64 ||
      Buffer.from(JSON.stringify(payload, null, 2), "utf8").toString("base64")
  });

  const polygonResult = await anchorHashOnPolygon(dataHash);
  const traceUrl = `${env.publicApiBaseUrl}/api/traceability/batches/${payload.batchCode}`;
  const qrCodeDataUrl = await QRCode.toDataURL(traceUrl, { margin: 1, width: 280 });

  return {
    dataHash,
    ipfsCid: ipfsResult.cid,
    ipfsUrl: ipfsResult.url,
    polygonTxHash: polygonResult.txHash,
    verificationStatus: polygonResult.mode === "live" ? "anchored" : "simulated",
    qrCodeDataUrl
  };
};

const anchorWorkflowEvent = async (payload) => {
  const dataHash = hashWorkflowEvent(payload);
  const polygonResult = await anchorHashOnPolygon(dataHash);

  return {
    dataHash,
    polygonTxHash: polygonResult.txHash,
    verificationStatus: polygonResult.mode === "live" ? "anchored" : "simulated"
  };
};

module.exports = {
  buildBatchCode,
  createTraceabilityArtifacts,
  anchorWorkflowEvent
};
