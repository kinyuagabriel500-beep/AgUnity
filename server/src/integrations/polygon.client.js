const { ethers } = require("ethers");
const env = require("../config/env");

const anchorHashOnPolygon = async (dataHash) => {
  if (!env.polygonPrivateKey) {
    return {
      txHash: ethers.keccak256(ethers.toUtf8Bytes(`simulated:${dataHash}`)),
      network: "polygon",
      mode: "simulated"
    };
  }

  try {
    const provider = new ethers.JsonRpcProvider(env.polygonRpcUrl);
    const wallet = new ethers.Wallet(env.polygonPrivateKey, provider);
    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0n,
      data: ethers.toUtf8Bytes(dataHash).slice(0, 120)
    });
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      network: "polygon",
      mode: "live"
    };
  } catch (_error) {
    return {
      txHash: ethers.keccak256(ethers.toUtf8Bytes(`fallback:${dataHash}`)),
      network: "polygon",
      mode: "simulated"
    };
  }
};

module.exports = { anchorHashOnPolygon };
