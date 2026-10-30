const { gigShieldContract, tokenContract, provider } = require("../config/blockchain");
const { ethers } = require("ethers");
const db = require("./db");

class RiderService {
  async registerRiderProfile({ fullName, walletAddress, phoneNumber, location, workerCategory }) {
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      throw new Error("A valid Ethereum wallet address is required.");
    }
    if (!fullName || fullName.trim().length === 0) {
      throw new Error("Full name is required.");
    }

    const normalizedAddr = walletAddress.toLowerCase();
    const existing = await db.getRider(normalizedAddr);

    const riderData = {
      fullName: fullName.trim(),
      walletAddress: walletAddress,
      phoneNumber: phoneNumber ? phoneNumber.trim() : "",
      location: location ? location.trim() : "",
      workerCategory: workerCategory || "Food Delivery",
      registeredAt: existing && existing.registeredAt ? existing.registeredAt : Date.now()
    };

    const saved = await db.saveRider(riderData);
    return saved;
  }

  async getRider(address) {
    if (!address || !ethers.isAddress(address)) {
      throw new Error("Invalid address format");
    }

    const dbRider = await db.getRider(address);
    let onChainReg = false;
    let onChainRider = null;

    if (gigShieldContract) {
      try {
        onChainReg = await gigShieldContract.isRiderRegistered(address);
        if (onChainReg) {
          onChainRider = await gigShieldContract.getRider(address);
        }
      } catch (err) {
        console.warn("On-chain rider query warning:", err.message);
      }
    }

    if (!dbRider && !onChainReg) {
      return { isRegistered: false };
    }

    return {
      isRegistered: true,
      wallet: address,
      fullName: dbRider ? dbRider.fullName : (onChainRider ? onChainRider.nickname : "Registered Rider"),
      nickname: onChainRider ? onChainRider.nickname : (dbRider ? dbRider.fullName : ""),
      phoneNumber: dbRider ? dbRider.phoneNumber : "",
      location: dbRider ? dbRider.location : "",
      workerCategory: dbRider ? dbRider.workerCategory : (onChainRider ? onChainRider.workerCategory : "Food Delivery"),
      registeredAt: dbRider ? dbRider.registeredAt : (onChainRider ? Number(onChainRider.registeredAt) * 1000 : Date.now())
    };
  }

  async getAllRidersWithStats() {
    const allDbRiders = await db.getAllRiders();

    // Enrich each rider with live on-chain stats (coverage, claims, payouts)
    const enrichedList = await Promise.all(
      allDbRiders.map(async (r) => {
        let coverageStatus = "Inactive";
        let totalClaims = 0;
        let totalPayouts = "0 GST";

        if (gigShieldContract) {
          try {
            const [hasActive, cov] = await gigShieldContract.getActiveCoverage(r.walletAddress);
            if (hasActive) {
              const nowSec = Math.floor(Date.now() / 1000);
              if (Number(cov.expiryTime) > nowSec) {
                coverageStatus = "Active";
              } else {
                coverageStatus = "Expired";
              }
            } else {
              // Check if they ever had a claimed coverage
              const ids = await gigShieldContract.getRiderCoverageIds(r.walletAddress);
              if (ids && ids.length > 0) {
                coverageStatus = "Expired";
              }
            }

            // Get Payout events for this rider
            const filterPayout = gigShieldContract.filters.PayoutIssued(null, r.walletAddress);
            const payoutEvents = await gigShieldContract.queryFilter(filterPayout, -5000);
            totalClaims = payoutEvents.length;

            let totalPayoutWei = 0n;
            payoutEvents.forEach((ev) => {
              totalPayoutWei += ev.args[2];
            });
            totalPayouts = `${parseFloat(ethers.formatEther(totalPayoutWei)).toFixed(0)} GST`;
          } catch (err) {
            console.warn(`Enrichment warning for ${r.walletAddress}:`, err.message);
          }
        }

        return {
          fullName: r.fullName,
          walletAddress: r.walletAddress,
          phoneNumber: r.phoneNumber || "",
          location: r.location || "Unspecified",
          workerCategory: r.workerCategory,
          registeredAt: r.registeredAt,
          coverageStatus,
          totalClaims,
          totalPayouts
        };
      })
    );

    return enrichedList;
  }

  async getCoverage(address) {
    if (!gigShieldContract) throw new Error("GigShield contract not connected");
    const [hasActive, cov] = await gigShieldContract.getActiveCoverage(address);
    if (!hasActive) return { hasActiveCoverage: false };

    return {
      hasActiveCoverage: true,
      coverage: {
        id: Number(cov.id),
        rider: cov.rider,
        startTime: Number(cov.startTime),
        expiryTime: Number(cov.expiryTime),
        premiumPaid: ethers.formatEther(cov.premiumPaid),
        payoutAmount: ethers.formatEther(cov.payoutAmount),
        status: Number(cov.status),
        hasClaimed: cov.hasClaimed
      }
    };
  }

  async getBalances(address) {
    const nativeWei = await provider.getBalance(address);
    let gstWei = 0n;
    if (tokenContract) {
      gstWei = await tokenContract.balanceOf(address);
    }
    return {
      tMSTC: ethers.formatEther(nativeWei),
      GST: ethers.formatEther(gstWei)
    };
  }

  async getPoolMetrics() {
    if (!gigShieldContract) throw new Error("GigShield contract not connected");
    const metrics = await gigShieldContract.getPlatformMetrics();
    return {
      poolBalance: ethers.formatEther(metrics[0]),
      totalRiders: Number(metrics[1]),
      totalPremiums: ethers.formatEther(metrics[2]),
      totalPayouts: ethers.formatEther(metrics[3]),
      dailyPremium: ethers.formatEther(metrics[4]),
      claimPayout: ethers.formatEther(metrics[5])
    };
  }

  async getClaimsAndTransactions(address) {
    if (!gigShieldContract) return { claims: [], transactions: [] };

    try {
      const filterActivated = gigShieldContract.filters.CoverageActivated(null, address);
      const filterPayout = gigShieldContract.filters.PayoutIssued(null, address);

      const [activatedEvents, payoutEvents] = await Promise.all([
        gigShieldContract.queryFilter(filterActivated, -5000),
        gigShieldContract.queryFilter(filterPayout, -5000)
      ]);

      const transactions = [];
      const claims = [];

      activatedEvents.forEach(e => {
        transactions.push({
          type: "Coverage Activated",
          coverageId: Number(e.args[0]),
          amount: ethers.formatEther(e.args[4]) + " GST",
          txHash: e.transactionHash,
          blockNumber: e.blockNumber,
          timestamp: Date.now()
        });
      });

      payoutEvents.forEach(e => {
        const item = {
          type: "Claim Payout Disbursed",
          eventId: e.args[0],
          amount: ethers.formatEther(e.args[2]) + " GST",
          txHash: e.transactionHash,
          blockNumber: e.blockNumber,
          timestamp: Number(e.args[3]) * 1000
        };
        transactions.push(item);
        claims.push(item);
      });

      return { claims, transactions };
    } catch (err) {
      console.warn("Event query error:", err.message);
      return { claims: [], transactions: [] };
    }
  }
}

module.exports = new RiderService();
