const express = require("express");
const router = express.Router();
const riderService = require("../services/riderService");
const verificationService = require("../services/verificationService");
const { provider, verifierWallet, GIGSHIELD_ADDRESS, GST_TOKEN_ADDRESS, CHAIN_ID, NETWORK_NAME } = require("../config/blockchain");

// Health Check
router.get("/health", async (req, res) => {
  try {
    if (!GIGSHIELD_ADDRESS || !GST_TOKEN_ADDRESS) {
      throw new Error(`${NETWORK_NAME} contract addresses are not configured.`);
    }
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) {
      throw new Error(`MST_RPC connected to chain ${network.chainId}; expected ${CHAIN_ID}.`);
    }
    const [gigShieldCode, tokenCode] = await Promise.all([
      provider.getCode(GIGSHIELD_ADDRESS),
      provider.getCode(GST_TOKEN_ADDRESS)
    ]);
    if (gigShieldCode === "0x" || tokenCode === "0x") {
      throw new Error("GigShield or GST contract code is missing at the configured MST address. Set GIGSHIELD_ADDRESS and GST_TOKEN_ADDRESS to deployed contracts.");
    }
    const blockNumber = await provider.getBlockNumber();
    res.json({
      status: "online",
      network: NETWORK_NAME,
      chainId: Number(network.chainId),
      currentBlock: blockNumber,
      verifierConfigured: !!verifierWallet,
      verifierAddress: verifierWallet ? verifierWallet.address : null,
      gigShieldAddress: GIGSHIELD_ADDRESS,
      tokenAddress: GST_TOKEN_ADDRESS
    });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
});

// Register or Sync Rider Profile
router.post("/rider/register", async (req, res) => {
  try {
    const saved = await riderService.registerRiderProfile(req.body);
    res.json({ success: true, rider: saved });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

// List All Registered Riders with Statistics
router.get("/riders", async (req, res) => {
  try {
    const list = await riderService.getAllRidersWithStats();
    res.json({ success: true, riders: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rider Info by Address
router.get("/rider/:address", async (req, res) => {
  try {
    const data = await riderService.getRider(req.params.address);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Coverage Info
router.get("/coverage/:address", async (req, res) => {
  try {
    const data = await riderService.getCoverage(req.params.address);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Balance Info
router.get("/balance/:address", async (req, res) => {
  try {
    const data = await riderService.getBalances(req.params.address);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pool Metrics
router.get("/pool", async (req, res) => {
  try {
    const data = await riderService.getPoolMetrics();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Claims
router.get("/claims/:address", async (req, res) => {
  try {
    const data = await riderService.getClaimsAndTransactions(req.params.address);
    res.json({ claims: data.claims });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transactions
router.get("/transactions/:address", async (req, res) => {
  try {
    const data = await riderService.getClaimsAndTransactions(req.params.address);
    res.json({ transactions: data.transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simulate Accident
router.post("/accident/simulate", (req, res) => {
  try {
    const data = verificationService.simulateAccident(req.body);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Verify & Payout
router.post("/accident/verify", async (req, res) => {
  try {
    const data = await verificationService.verifyAndExecutePayout(req.body);
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
