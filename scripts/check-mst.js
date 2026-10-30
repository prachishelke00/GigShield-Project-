const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("=========================================");
  console.log("   MST TESTNET CONNECTIVITY & DIAGNOSTIC ");
  console.log("=========================================\n");

  const rpcUrl = process.env.MST_TESTNET_RPC || process.env.MST_RPC || "https://testnetrpc.mstblockchain.com";
  console.log("Configured RPC:", rpcUrl);

  const provider = new hre.ethers.JsonRpcProvider(rpcUrl);

  try {
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    console.log("✓ Connected to Network!");
    console.log("  - Chain ID:", network.chainId.toString(), network.chainId.toString() === "91562037" ? "(MST Testnet Confirmed)" : "(Unexpected Chain ID)");
    console.log("  - Current Block Number:", blockNumber);
  } catch (err) {
    console.error("✗ Failed to reach MST Testnet RPC:", err.message);
    return;
  }

  const rawKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!rawKey || rawKey.trim() === "") {
    console.log("\n[Notice] No DEPLOYER_PRIVATE_KEY or PRIVATE_KEY configured in .env yet.");
    console.log("To deploy to MST Testnet:");
    console.log("1. Create a dedicated testnet wallet in BridgeKey or MetaMask.");
    console.log("2. Request test tokens from https://faucet.mstblockchain.com/");
    console.log("3. Add your testnet private key to .env as DEPLOYER_PRIVATE_KEY=0x...");
    console.log("4. Re-run this check script: node scripts/check-mst.js\n");
    return;
  }

  try {
    const formattedKey = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
    const wallet = new hre.ethers.Wallet(formattedKey, provider);
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = hre.ethers.formatEther(balance);

    console.log("\nDeployer Wallet Information:");
    console.log("  - Public Address:", wallet.address);
    console.log("  - Balance:       ", balanceEth, "tMSTC");

    if (balance === 0n) {
      console.log("\n⚠️ Deployer account has 0 tMSTC balance.");
      console.log("Please obtain test tokens from the faucet before deploying:");
      console.log("Faucet URL: https://faucet.mstblockchain.com/\n");
    } else {
      console.log("\n✓ Wallet is funded and ready for contract deployment!");
      console.log("Run: npm run deploy:mst\n");
    }
  } catch (err) {
    console.error("\n✗ Error reading wallet credentials:", err.message);
  }
}

main().catch((err) => {
  console.error("Diagnostic failed:", err);
  process.exitCode = 1;
});
