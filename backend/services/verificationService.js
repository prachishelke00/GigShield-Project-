const { gigShieldContract, verifierWallet, IS_MAINNET } = require("../config/blockchain");
const { ethers } = require("ethers");

class VerificationService {
  simulateAccident({ riderAddress, customSeverity, customLocation }) {
    if (IS_MAINNET) {
      throw new Error("Synthetic accident simulation is disabled on Mainnet.");
    }
    if (!riderAddress || !ethers.isAddress(riderAddress)) {
      throw new Error("Valid riderAddress is required");
    }

    const locations = [
      "Outer Ring Road, Bellandur, Bengaluru",
      "Indiranagar 100ft Road, Bengaluru",
      "Koramangala 80ft Road, Bengaluru",
      "HSR Layout Sector 1, Bengaluru",
      "MG Road Junction, Bengaluru",
      "Electronic City Phase 1, Bengaluru"
    ];

    const timestamp = Math.floor(Date.now() / 1000);
    const eventNonce = Math.floor(Math.random() * 1000000);
    const eventId = ethers.keccak256(
      ethers.toUtf8Bytes(`SIMULATED_ACCIDENT_${riderAddress}_${timestamp}_${eventNonce}`)
    );

    const severity = customSeverity ? parseInt(customSeverity) : Math.floor(Math.random() * 30) + 45; // 4.5G - 7.5G
    const location = customLocation || locations[Math.floor(Math.random() * locations.length)];

    const sensorDataURI = JSON.stringify({
      simulationNotice: "SIMULATED TELEMATICS DATA - BUILDATHON DEMO",
      accelerometer: {
        peakG: (severity / 10).toFixed(1) + "G",
        vector: [0.35, -0.22, (severity / 10).toFixed(1)],
        impactDurationMs: 280
      },
      gyroscope: {
        rollAngleDeg: 82.5,
        tiltAnomaly: true
      },
      gpsTimestamp: timestamp,
      deviceStatus: "PASS_VERIFIED"
    });

    return {
      success: true,
      eventId,
      riderAddress,
      impactSeverity: severity,
      impactSeverityDisplay: (severity / 10).toFixed(1) + "G",
      location,
      sensorDataURI,
      timestamp,
      simulated: true
    };
  }

  async verifyAndExecutePayout({ eventId, riderAddress, impactSeverity, location, sensorDataURI }) {
    if (IS_MAINNET) {
      throw new Error("Automated payouts are disabled on Mainnet until a production oracle is reviewed and implemented.");
    }
    if (!eventId || !riderAddress || !impactSeverity) {
      throw new Error("Missing required event data");
    }

    if (!gigShieldContract || !verifierWallet) {
      throw new Error("Verifier backend wallet or smart contract not configured");
    }

    // 1. Pre-validation checks against contract
    const isReg = await gigShieldContract.isRiderRegistered(riderAddress);
    if (!isReg) {
      throw new Error("Rider is not registered on-chain");
    }

    const [hasActive, cov] = await gigShieldContract.getActiveCoverage(riderAddress);
    if (!hasActive) {
      throw new Error("No active coverage found for this rider");
    }

    if (parseInt(impactSeverity) < 40) {
      throw new Error(`Impact severity ${(impactSeverity / 10).toFixed(1)}G is below threshold of 4.0G`);
    }

    // 2. Submit verifyAccidentAndPay from authorized verifier
    const contractWithSigner = gigShieldContract.connect(verifierWallet);

    const tx = await contractWithSigner.verifyAccidentAndPay(
      eventId,
      riderAddress,
      impactSeverity,
      location || "Simulated Crash Location",
      sensorDataURI || "simulated://telematics"
    );

    const receipt = await tx.wait(1);

    return {
      success: true,
      message: "Accident verified and 500 GST payout dispatched on MST Blockchain",
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      explorerUrl: `https://testnet.mstscan.com/tx/${tx.hash}`,
      payoutAmount: "500 GST"
    };
  }
}

module.exports = new VerificationService();
