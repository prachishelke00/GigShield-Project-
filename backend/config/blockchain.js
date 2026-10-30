const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const MST_RPC = process.env.MST_RPC || "https://testnetrpc.mstblockchain.com";
const provider = new ethers.JsonRpcProvider(MST_RPC);

// Load artifacts for ABIs
const gigShieldArtifactPath = path.join(__dirname, "..", "..", "artifacts", "contracts", "GigShield.sol", "GigShield.json");
const tokenArtifactPath = path.join(__dirname, "..", "..", "artifacts", "contracts", "GigShieldToken.sol", "GigShieldToken.json");

let gigShieldAbi = [];
let tokenAbi = [];

try {
  if (fs.existsSync(gigShieldArtifactPath)) {
    gigShieldAbi = JSON.parse(fs.readFileSync(gigShieldArtifactPath, "utf8")).abi;
  }
  if (fs.existsSync(tokenArtifactPath)) {
    tokenAbi = JSON.parse(fs.readFileSync(tokenArtifactPath, "utf8")).abi;
  }
} catch (err) {
  console.warn("Artifact load warning:", err.message);
}

const GIGSHIELD_ADDRESS = process.env.GIGSHIELD_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const GST_TOKEN_ADDRESS = process.env.GST_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const VERIFIER_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY || "";

let verifierWallet = null;
let gigShieldContract = null;
let tokenContract = null;

if (VERIFIER_PRIVATE_KEY && VERIFIER_PRIVATE_KEY.length >= 64) {
  try {
    const formattedKey = VERIFIER_PRIVATE_KEY.startsWith("0x") ? VERIFIER_PRIVATE_KEY : "0x" + VERIFIER_PRIVATE_KEY;
    verifierWallet = new ethers.Wallet(formattedKey, provider);
  } catch (err) {
    console.error("Verifier Wallet init error:", err.message);
  }
}

// Contract instances with provider (read) or signer (write)
try {
  const runner = verifierWallet || provider;
  if (GIGSHIELD_ADDRESS && gigShieldAbi.length > 0) {
    gigShieldContract = new ethers.Contract(GIGSHIELD_ADDRESS, gigShieldAbi, runner);
  }
  if (GST_TOKEN_ADDRESS && tokenAbi.length > 0) {
    tokenContract = new ethers.Contract(GST_TOKEN_ADDRESS, tokenAbi, runner);
  }
} catch (err) {
  console.error("Contract binding error:", err.message);
}

module.exports = {
  provider,
  verifierWallet,
  gigShieldContract,
  tokenContract,
  GIGSHIELD_ADDRESS,
  GST_TOKEN_ADDRESS,
  CHAIN_ID: 91562037
};

