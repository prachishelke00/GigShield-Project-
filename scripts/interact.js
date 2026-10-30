const hre = require("hardhat");

async function main() {
  console.log("==================================================");
  console.log("   GIGSHIELD 2.0 - FULL MICRO-INSURANCE SIMULATION ");
  console.log("   PREMIUM -> ACCIDENT -> VERIFICATION -> PAYOUT  ");
  console.log("==================================================");

  const [insurer, rider, oracle] = await hre.ethers.getSigners();
  console.log("Insurer/Deployer: ", insurer.address);
  console.log("Delivery Rider:   ", rider.address);
  console.log("Telematics Oracle:", oracle.address);

  // 1. Deploy Contract and Seed Pool
  console.log("\n1. Deploying GigShield contract with 5.0 tMSTC pool liquidity...");
  const GigShield = await hre.ethers.getContractFactory("GigShield");
  const gigShield = await GigShield.deploy({ value: hre.ethers.parseEther("5.0") });
  await gigShield.waitForDeployment();
  const contractAddress = await gigShield.getAddress();
  console.log("✓ Contract deployed at:", contractAddress);
  console.log("✓ Initial Pool Liquidity:", hre.ethers.formatEther(await gigShield.getPoolBalance()), "tMSTC");

  // 2. Rider purchases shift protection policy
  console.log("\n2. Food delivery rider purchases 24h accident protection...");
  const riderInitialBalance = await hre.ethers.provider.getBalance(rider.address);
  console.log("  Rider Balance Before:", hre.ethers.formatEther(riderInitialBalance), "tMSTC");

  const premium = hre.ethers.parseEther("0.05"); // 0.05 tMSTC
  const txPurchase = await gigShield
    .connect(rider)
    .purchasePolicy("Rahul - Delivery Partner #104", 24, { value: premium });
  const receiptPurchase = await txPurchase.wait();

  console.log("✓ Policy purchased in Tx:", receiptPurchase.hash);
  const policy = await gigShield.getPolicy(1);
  console.log(`✓ Policy #1 Active! Rider: "${policy.riderName}", Premium: ${hre.ethers.formatEther(policy.premiumPaid)} tMSTC, Coverage Benefit: ${hre.ethers.formatEther(policy.coverageAmount)} tMSTC`);
  console.log("✓ Pool Balance After Premium:", hre.ethers.formatEther(await gigShield.getPoolBalance()), "tMSTC");

  // 3. Accident simulation telemetry
  console.log("\n3. Telematics Sensor Alert: Road accident detected while delivering!");
  const impactGForce = 72; // 7.2G impact (safety threshold >= 4.0G / 40)
  const location = "12.9716° N, 77.5946° E - Outer Ring Road";
  const telemetryDetails = "Sudden deceleration from 48km/h to 0km/h with severe 7.2G lateral shock";
  console.log(`  Telemetry: Impact = ${impactGForce / 10}G, Location = "${location}"`);

  // 4. Parametric Accident Verification & Instant Payout
  console.log("\n4. Triggering automated smart-contract payout...");
  const balanceBeforePayout = await hre.ethers.provider.getBalance(rider.address);

  const txPayout = await gigShield
    .connect(rider)
    .triggerAccidentPayout(1, impactGForce, location, telemetryDetails);
  const receiptPayout = await txPayout.wait();
  const gasSpent = receiptPayout.gasUsed * receiptPayout.gasPrice;

  console.log("✓ Payout Transaction Confirmed! Tx Hash:", receiptPayout.hash);
  console.log("  Block Number:", receiptPayout.blockNumber);

  // 5. Verification of On-Chain Token Movement
  const balanceAfterPayout = await hre.ethers.provider.getBalance(rider.address);
  const payoutReceived = balanceAfterPayout - balanceBeforePayout + gasSpent;

  console.log("\n5. On-Chain Financial Settlement Verification:");
  console.log("✓ Direct Payout to Rider: +", hre.ethers.formatEther(payoutReceived), "tMSTC");
  console.log("✓ Remaining Pool Balance: ", hre.ethers.formatEther(await gigShield.getPoolBalance()), "tMSTC");

  const finalPolicy = await gigShield.getPolicy(1);
  console.log("✓ Policy Status:          ", finalPolicy.status === 1n ? "PaidOut (Claim Settled)" : "Other");
  console.log("✓ Claim Claimed Flag:     ", finalPolicy.hasClaimed);

  console.log("\n==================================================");
  console.log("   GIGSHIELD 2.0 DEMO SIMULATION SUCCESSFUL!      ");
  console.log("==================================================");
}

main().catch((error) => {
  console.error("Simulation failed:", error);
  process.exitCode = 1;
});
