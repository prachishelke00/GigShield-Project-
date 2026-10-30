const express = require("express");
const router = express.Router();
const riderService = require("../services/riderService");
const verificationService = require("../services/verificationService");
const { provider, verifierWallet, GIGSHIELD_ADDRESS, GST_TOKEN_ADDRESS } = require("../config/blockchain");

// Health Check
router.get("/health", async (req, res) => {
  try {
    const blockNumber = await provider.getBlockNumber();
    res.json({
      status: "online",
      network: "MST Testnet",
      chainId: 91562037,
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
    res.status(400).json({ success: false, error: error.message });
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
