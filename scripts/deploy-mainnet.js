const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const MAINNET_CHAIN_ID = 4646;
const DEPLOY_CONFIRMATION = "DEPLOY_GIGSHIELD_TO_MST_MAINNET";
const MAINNET_PUBLIC_RPC_URL = "https://mariorpc.mstblockchain.com";
const TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)"
];

async function main() {
  if (hre.network.name !== "mstMainnet") {
    throw new Error("Refusing deployment: run this script only with --network mstMainnet.");
  }
  if (process.env.MAINNET_DEPLOY_CONFIRM !== DEPLOY_CONFIRMATION) {
    throw new Error(`Refusing deployment. Set MAINNET_DEPLOY_CONFIRM=${DEPLOY_CONFIRMATION} only when explicitly ready to deploy.`);
  }

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("Set MAINNET_DEPLOYER_PRIVATE_KEY in .env to enable the Mainnet Hardhat signer.");
  }

  const network = await hre.ethers.provider.getNetwork();
  if (Number(network.chainId) !== MAINNET_CHAIN_ID) {
    throw new Error(`Refusing deployment: RPC chain ID is ${network.chainId}; expected ${MAINNET_CHAIN_ID}.`);
  }

  const verifierAddress = process.env.MAINNET_VERIFIER_ADDRESS;
  if (!verifierAddress || !hre.ethers.isAddress(verifierAddress)) {
    throw new Error("MAINNET_VERIFIER_ADDRESS must identify the separately secured production verifier.");
  }

  const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("MST Mainnet deployment preflight passed.");
  console.log("Chain ID:", Number(network.chainId));
  console.log("Deployer:", deployer.address);
  console.log("Available MSTC:", hre.ethers.formatEther(deployerBalance));
  console.log("Initial verifier:", verifierAddress);

  const MainnetToken = await hre.ethers.getContractFactory("GigShieldMainnetToken");
  const GigShield = await hre.ethers.getContractFactory("GigShield");
  const [tokenDeploymentData, gigShieldDeploymentData, feeData] = await Promise.all([
    MainnetToken.getDeployTransaction(),
    GigShield.getDeployTransaction(deployer.address, verifierAddress),
    hre.ethers.provider.getFeeData()
  ]);
  const [tokenDeployment, gigShieldDeployment] = await Promise.all([
    hre.ethers.provider.estimateGas({ ...tokenDeploymentData, from: deployer.address }),
    hre.ethers.provider.estimateGas({ ...gigShieldDeploymentData, from: deployer.address })
  ]);
  const estimatedFeePerGas = feeData.maxFeePerGas || feeData.gasPrice;
  const totalEstimatedGas = tokenDeployment + gigShieldDeployment;
  const estimatedDeploymentCost = estimatedFeePerGas ? totalEstimatedGas * estimatedFeePerGas : null;
  console.log("Estimated token deployment gas:", tokenDeployment.toString());
  console.log("Estimated GigShield deployment gas:", gigShieldDeployment.toString());
  if (estimatedDeploymentCost !== null) {
    console.log("Estimated deployment cost (MSTC):", hre.ethers.formatEther(estimatedDeploymentCost));
    if (deployerBalance < estimatedDeploymentCost) {
      throw new Error("Deployer balance is below the estimated two-contract deployment cost.");
    }
  }

  const token = await MainnetToken.deploy();
  const tokenDeploymentTransaction = token.deploymentTransaction();
  const tokenReceipt = await tokenDeploymentTransaction.wait(1);
  if (!tokenReceipt || tokenReceipt.status !== 1) {
    throw new Error("Mainnet GST token deployment did not receive a successful receipt.");
  }
  const tokenAddress = await token.getAddress();

  const gigShield = await GigShield.deploy(tokenAddress, verifierAddress);
  const gigShieldDeploymentTransaction = gigShield.deploymentTransaction();
  const gigShieldReceipt = await gigShieldDeploymentTransaction.wait(1);
  if (!gigShieldReceipt || gigShieldReceipt.status !== 1) {
    throw new Error("GigShield deployment did not receive a successful Mainnet receipt.");
  }

  const gigShieldAddress = await gigShield.getAddress();
  const artifact = await hre.artifacts.readArtifact("GigShield");
  const tokenArtifact = await hre.artifacts.readArtifact("GigShieldMainnetToken");
  const outputPath = path.join(__dirname, "..", "frontend", "config.mainnet.js");
  const config = {
    network: "MST Mainnet",
    mainnetReady: true,
    productionOracleReady: false,
    chainId: MAINNET_CHAIN_ID,
    chainIdHex: "0x1226",
    chainName: "MST Mainnet",
    nativeCurrency: { name: "MSTC", symbol: "MSTC", decimals: 18 },
    rpcUrl: MAINNET_PUBLIC_RPC_URL,
    explorerUrl: "https://mstscan.com",
    gigShieldAddress,
    gstTokenAddress: tokenAddress,
    gigShieldAbi: artifact.abi,
    gstTokenAbi: tokenArtifact.abi.filter((entry) =>
      entry.type === "function" && TOKEN_ABI.some((signature) =>
        signature.includes(` ${entry.name}(`)
      )
    )
  };
  const configContent = `window.GIGSHIELD_MAINNET_CONFIG = ${JSON.stringify(config, null, 2)};
window.GIGSHIELD_MAINNET_CONFIG.backendUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3001"
  : window.location.origin;
`;
  fs.writeFileSync(outputPath, configContent, "utf8");

  console.log("Mainnet GST token address:", tokenAddress);
  console.log("GST token deployment transaction:", tokenDeploymentTransaction.hash);
  console.log("GigShield address:", gigShieldAddress);
  console.log("GigShield deployment transaction:", gigShieldDeploymentTransaction.hash);
  console.log("Explorer:", `https://mstscan.com/address/${gigShieldAddress}`);
  console.log("The fixed 1,000,000 GST supply was minted to the deployer; no faucet or pool funding was performed.");
  console.log("Mainnet frontend config written to frontend/config.mainnet.js.");
  console.log("Production accident payouts remain disabled until a reviewed production oracle is implemented.");
}

main().catch((error) => {
  console.error("Mainnet deployment refused or failed:", error.message);
  process.exitCode = 1;
});
