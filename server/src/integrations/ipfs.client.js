const crypto = require("crypto");
const env = require("../config/env");

const uploadFileToIpfs = async ({ fileName, fileContentBase64 }) => {
  const contentHash = crypto.createHash("sha256").update(fileContentBase64 || "").digest("hex");
  const fallbackCid = `mockcid-${contentHash.slice(0, 24)}`;

  if (!env.ipfsApiUrl) {
    return {
      cid: fallbackCid,
      url: `${env.ipfsGatewayUrl}${fallbackCid}`,
      mode: "simulated"
    };
  }

  try {
    const response = await fetch(env.ipfsApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: env.ipfsApiToken ? `Bearer ${env.ipfsApiToken}` : ""
      },
      body: JSON.stringify({
        fileName,
        contentBase64: fileContentBase64
      })
    });

    if (!response.ok) throw new Error("IPFS upload failed");
    const data = await response.json();
    const cid = data.cid || data.IpfsHash || fallbackCid;

    return {
      cid,
      url: `${env.ipfsGatewayUrl}${cid}`,
      mode: "live"
    };
  } catch (_error) {
    return {
      cid: fallbackCid,
      url: `${env.ipfsGatewayUrl}${fallbackCid}`,
      mode: "simulated"
    };
  }
};

module.exports = { uploadFileToIpfs };
