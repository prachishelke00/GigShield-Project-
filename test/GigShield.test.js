// GigShield 2.0 – Complete Test Suite
// Tests the GigShieldToken (ERC-20 GST) + GigShield (micro-insurance) architecture.
// Run with: npx hardhat test

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GigShieldToken (GST ERC-20)", function () {
  let token, owner, rider1, rider2, stranger;

  beforeEach(async function () {
    [owner, rider1, rider2, stranger] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("GigShieldToken");
    token = await Token.deploy();
    await token.waitForDeployment();
  });

  it("should set correct name, symbol, and decimals", async function () {
    expect(await token.name()).to.equal("GigShield Test Token");
    expect(await token.symbol()).to.equal("GST");
    expect(await token.decimals()).to.equal(18);
  });

  it("should mint 1,000,000 GST to owner on deploy", async function () {
    const expected = ethers.parseEther("1000000");
    expect(await token.balanceOf(owner.address)).to.equal(expected);
    expect(await token.totalSupply()).to.equal(expected);
  });

  it("should allow owner to mint more tokens", async function () {
    const amount = ethers.parseEther("5000");
    await token.connect(owner).mint(rider1.address, amount);
    expect(await token.balanceOf(rider1.address)).to.equal(amount);
  });

  it("should reject non-owner mint attempts", async function () {
    await expect(
      token.connect(stranger).mint(stranger.address, ethers.parseEther("100"))
    ).to.be.revertedWithCustomError(token, "Unauthorized");
  });

  it("faucet should dispense 500 GST per call", async function () {
    await token.connect(rider1).requestDemoTokens(rider1.address);
    expect(await token.balanceOf(rider1.address)).to.equal(
      ethers.parseEther("500")
    );
  });

  it("faucet should dispense to any address (called by anyone)", async function () {
    await token.connect(stranger).requestDemoTokens(rider2.address);
    expect(await token.balanceOf(rider2.address)).to.equal(
      ethers.parseEther("500")
    );
  });

  it("should revert faucet for zero address", async function () {
    await expect(
      token.requestDemoTokens(ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(token, "InvalidAddress");
  });

  it("should transfer tokens correctly", async function () {
    await token.connect(owner).transfer(rider1.address, ethers.parseEther("200"));
    expect(await token.balanceOf(rider1.address)).to.equal(
      ethers.parseEther("200")
    );
  });

  it("should approve and transferFrom correctly", async function () {
    const amount = ethers.parseEther("300");
    await token.connect(owner).approve(rider1.address, amount);
    expect(await token.allowance(owner.address, rider1.address)).to.equal(amount);

    await token.connect(rider1).transferFrom(owner.address, rider2.address, amount);
    expect(await token.balanceOf(rider2.address)).to.equal(amount);
  });

  it("should revert transferFrom when allowance is insufficient", async function () {
    await token.connect(owner).approve(rider1.address, ethers.parseEther("10"));
    await expect(
      token.connect(rider1).transferFrom(
        owner.address,
        rider2.address,
        ethers.parseEther("100")
      )
    ).to.be.revertedWithCustomError(token, "InsufficientAllowance");
  });
});

describe("GigShieldMainnetToken (fixed-supply GST)", function () {
  let token, owner, rider;

  beforeEach(async function () {
    [owner, rider] = await ethers.getSigners();
    const MainnetToken = await ethers.getContractFactory("GigShieldMainnetToken");
    token = await MainnetToken.deploy();
    await token.waitForDeployment();
  });

  it("mints the fixed maximum supply to the deployer", async function () {
    const maxSupply = ethers.parseEther("1000000");
    expect(await token.MAX_SUPPLY()).to.equal(maxSupply);
    expect(await token.totalSupply()).to.equal(maxSupply);
    expect(await token.balanceOf(owner.address)).to.equal(maxSupply);
  });

  it("does not expose faucet or additional mint functions", async function () {
    const functionNames = token.interface.fragments
      .filter((fragment) => fragment.type === "function")
      .map((fragment) => fragment.name);
    expect(functionNames).not.to.include("requestDemoTokens");
    expect(functionNames).not.to.include("mint");
  });

  it("supports standard transfers and approved premium collection", async function () {
    const amount = ethers.parseEther("50");
    await token.transfer(rider.address, amount);
    await token.connect(rider).approve(owner.address, amount);
    await token.transferFrom(rider.address, owner.address, amount);
    expect(await token.balanceOf(rider.address)).to.equal(0n);
    expect(await token.balanceOf(owner.address)).to.equal(await token.MAX_SUPPLY());
  });
});

describe("GigShield (Main Insurance Contract)", function () {
  let token, gigShield, owner, verifier, rider1, rider2, stranger;

  // Constants matching the contract
  const DAILY_PREMIUM = ethers.parseEther("50");     // 50 GST/day
  const CLAIM_PAYOUT  = ethers.parseEther("500");    // 500 GST per accident
  const FAUCET_AMOUNT = ethers.parseEther("500");    // GST faucet
  const MIN_SEVERITY  = 40n;                         // 4.0G threshold

  async function setupRiderWithCoverage(rider, days) {
    days = days || 1;
    // Register
    await gigShield.connect(rider).registerRider("TestRider", "Food Delivery");
    // Fund rider with GST
    await token.connect(owner).mint(rider.address, ethers.parseEther("10000"));
    // Approve premium
    const premium = DAILY_PREMIUM * BigInt(days);
    await token.connect(rider).approve(await gigShield.getAddress(), premium);
    // Activate coverage
    const tx = await gigShield.connect(rider).activateCoverage(days);
    return tx;
  }

  beforeEach(async function () {
    [owner, verifier, rider1, rider2, stranger] = await ethers.getSigners();

    // Deploy token
    const Token = await ethers.getContractFactory("GigShieldToken");
    token = await Token.deploy();
    await token.waitForDeployment();

    // Deploy GigShield with token address + verifier
    const GigShield = await ethers.getContractFactory("GigShield");
    gigShield = await GigShield.deploy(
      await token.getAddress(),
      verifier.address
    );
    await gigShield.waitForDeployment();
  });

  // ─── DEPLOYMENT ────────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("should set owner correctly", async function () {
      expect(await gigShield.owner()).to.equal(owner.address);
    });

    it("should set authorizedVerifier correctly", async function () {
      expect(await gigShield.authorizedVerifier()).to.equal(verifier.address);
    });

    it("should store correct token address", async function () {
      expect(await gigShield.token()).to.equal(await token.getAddress());
    });

    it("should start with zero pool balance", async function () {
      expect(await gigShield.poolBalance()).to.equal(0n);
    });

    it("should revert deploy with zero token address", async function () {
      const GigShield = await ethers.getContractFactory("GigShield");
      await expect(
        GigShield.deploy(ethers.ZeroAddress, verifier.address)
      ).to.be.revertedWithCustomError(gigShield, "InvalidAddress");
    });

    it("should revert deploy with zero verifier address", async function () {
      const GigShield = await ethers.getContractFactory("GigShield");
      await expect(
        GigShield.deploy(await token.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(gigShield, "InvalidAddress");
    });
  });

  // ─── RIDER REGISTRATION ────────────────────────────────────────────────────

  describe("Rider Registration", function () {
    it("should register a rider successfully and emit event", async function () {
      const tx = gigShield.connect(rider1).registerRider("Arjun", "Food Delivery");
      await expect(tx).to.emit(gigShield, "RiderRegistered");

      const r = await gigShield.getRider(rider1.address);
      expect(r.nickname).to.equal("Arjun");
      expect(r.workerCategory).to.equal("Food Delivery");
      expect(r.isRegistered).to.equal(true);
    });

    it("should increment totalRidersRegistered", async function () {
      await gigShield.connect(rider1).registerRider("R1", "Courier/Parcel");
      await gigShield.connect(rider2).registerRider("R2", "Grocery Delivery");
      expect(await gigShield.totalRidersRegistered()).to.equal(2n);
    });

    it("should reject duplicate registration", async function () {
      await gigShield.connect(rider1).registerRider("R1", "Food Delivery");
      await expect(
        gigShield.connect(rider1).registerRider("R1Again", "Courier/Parcel")
      ).to.be.revertedWithCustomError(gigShield, "RiderAlreadyRegistered");
    });

    it("should reject empty nickname", async function () {
      await expect(
        gigShield.connect(rider1).registerRider("", "Food Delivery")
      ).to.be.revertedWithCustomError(gigShield, "EmptyStringParameter");
    });

    it("should reject empty workerCategory", async function () {
      await expect(
        gigShield.connect(rider1).registerRider("Rider", "")
      ).to.be.revertedWithCustomError(gigShield, "EmptyStringParameter");
    });
  });

  // ─── COVERAGE ACTIVATION ───────────────────────────────────────────────────

  describe("Coverage Activation", function () {
    beforeEach(async function () {
      await gigShield.connect(rider1).registerRider("Rider1", "Food Delivery");
      await token.connect(owner).mint(rider1.address, ethers.parseEther("10000"));
    });

    it("should activate 1-day coverage after approval", async function () {
      await token
        .connect(rider1)
        .approve(await gigShield.getAddress(), DAILY_PREMIUM);

      await expect(gigShield.connect(rider1).activateCoverage(1))
        .to.emit(gigShield, "CoverageActivated");

      const result = await gigShield.getActiveCoverage(rider1.address);
      expect(result[0]).to.equal(true);
      expect(result[1].premiumPaid).to.equal(DAILY_PREMIUM);
      expect(result[1].payoutAmount).to.equal(CLAIM_PAYOUT);
    });

    it("should transfer premium from rider to contract", async function () {
      await token
        .connect(rider1)
        .approve(await gigShield.getAddress(), DAILY_PREMIUM);
      const before = await token.balanceOf(rider1.address);
      await gigShield.connect(rider1).activateCoverage(1);
      const after = await token.balanceOf(rider1.address);
      expect(before - after).to.equal(DAILY_PREMIUM);
    });

    it("should update poolBalance after activation", async function () {
      await token
        .connect(rider1)
        .approve(await gigShield.getAddress(), DAILY_PREMIUM * 3n);
      await gigShield.connect(rider1).activateCoverage(3);
      expect(await gigShield.poolBalance()).to.equal(DAILY_PREMIUM * 3n);
    });

    it("should reject unregistered rider", async function () {
      await token
        .connect(stranger)
        .approve(await gigShield.getAddress(), DAILY_PREMIUM);
      await expect(
        gigShield.connect(stranger).activateCoverage(1)
      ).to.be.revertedWithCustomError(gigShield, "RiderNotRegistered");
    });

    it("should reject zero durationDays", async function () {
      await token
        .connect(rider1)
        .approve(await gigShield.getAddress(), DAILY_PREMIUM);
      await expect(
        gigShield.connect(rider1).activateCoverage(0)
      ).to.be.revertedWithCustomError(gigShield, "InvalidZeroAmount");
    });

    it("should reject duplicate active coverage", async function () {
      await token
        .connect(rider1)
        .approve(await gigShield.getAddress(), DAILY_PREMIUM * 2n);
      await gigShield.connect(rider1).activateCoverage(1);
      await expect(
        gigShield.connect(rider1).activateCoverage(1)
      ).to.be.revertedWithCustomError(gigShield, "ActiveCoverageExists");
    });
  });

  // ─── POOL FUNDING ──────────────────────────────────────────────────────────

  describe("Pool Funding", function () {
    it("should allow anyone to fund the payout pool", async function () {
      const amount = ethers.parseEther("10000");
      await token.connect(owner).approve(await gigShield.getAddress(), amount);

      await expect(gigShield.connect(owner).fundPayoutPool(amount))
        .to.emit(gigShield, "PayoutPoolFunded")
        .withArgs(owner.address, amount, amount);

      expect(await gigShield.poolBalance()).to.equal(amount);
    });

    it("should reject zero funding amount", async function () {
      await expect(
        gigShield.connect(owner).fundPayoutPool(0)
      ).to.be.revertedWithCustomError(gigShield, "InvalidZeroAmount");
    });
  });

  // ─── ACCIDENT VERIFICATION & PAYOUT ───────────────────────────────────────

  describe("Accident Verification & Payout", function () {
    const GOOD_EVENT_ID = ethers.keccak256(ethers.toUtf8Bytes("event_001"));

    beforeEach(async function () {
      // Register and activate coverage for rider1
      await setupRiderWithCoverage(rider1, 1);

      // Fund pool with enough GST for payout
      const poolFund = ethers.parseEther("5000");
      await token.connect(owner).approve(await gigShield.getAddress(), poolFund);
      await gigShield.connect(owner).fundPayoutPool(poolFund);
    });

    it("should verify accident and transfer GST payout to rider", async function () {
      const before = await token.balanceOf(rider1.address);

      await expect(
        gigShield.connect(verifier).verifyAccidentAndPay(
          GOOD_EVENT_ID,
          rider1.address,
          68n, // 6.8G — above 4.0G threshold
          "MG Road, Bangalore",
          "ipfs://sensor-data-001"
        )
      )
        .to.emit(gigShield, "AccidentVerified")
        .to.emit(gigShield, "PayoutIssued");

      const after = await token.balanceOf(rider1.address);
      expect(after - before).to.equal(CLAIM_PAYOUT);
    });

    it("should also allow owner to call verifyAccidentAndPay", async function () {
      await expect(
        gigShield.connect(owner).verifyAccidentAndPay(
          GOOD_EVENT_ID,
          rider1.address,
          55n,
          "Location A",
          "uri://data"
        )
      ).to.emit(gigShield, "PayoutIssued");
    });

    it("should reject call from unauthorized address", async function () {
      await expect(
        gigShield.connect(stranger).verifyAccidentAndPay(
          GOOD_EVENT_ID,
          rider1.address,
          68n,
          "Somewhere",
          "uri://data"
        )
      ).to.be.revertedWithCustomError(gigShield, "Unauthorized");
    });

    it("should reject duplicate event IDs", async function () {
      await gigShield.connect(verifier).verifyAccidentAndPay(
        GOOD_EVENT_ID, rider1.address, 68n, "Loc", "uri"
      );
      await setupRiderWithCoverage(rider2, 1);
      const poolFund2 = ethers.parseEther("5000");
      await token.connect(owner).approve(await gigShield.getAddress(), poolFund2);
      await gigShield.connect(owner).fundPayoutPool(poolFund2);
      await expect(
        gigShield.connect(verifier).verifyAccidentAndPay(
          GOOD_EVENT_ID, rider2.address, 68n, "Loc2", "uri2"
        )
      ).to.be.revertedWithCustomError(gigShield, "EventAlreadyProcessed");
    });

    it("should reject impact severity below threshold (< 40)", async function () {
      await expect(
        gigShield.connect(verifier).verifyAccidentAndPay(
          GOOD_EVENT_ID,
          rider1.address,
          35n, // 3.5G — below 4.0G
          "Location",
          "uri://data"
        )
      ).to.be.revertedWithCustomError(gigShield, "InsufficientSeverity");
    });

    it("should reject if rider has no active coverage", async function () {
      const eventId = ethers.keccak256(ethers.toUtf8Bytes("event_nocov"));
      await gigShield.connect(rider2).registerRider("Rider2", "Grocery Delivery");
      // rider2 did NOT activate coverage
      await expect(
        gigShield.connect(verifier).verifyAccidentAndPay(
          eventId, rider2.address, 68n, "Location", "uri://data"
        )
      ).to.be.revertedWithCustomError(gigShield, "NoActiveCoverage");
    });

    it("should reject if pool has insufficient funds", async function () {
      // Deploy fresh contract with empty pool
      const Token = await ethers.getContractFactory("GigShieldToken");
      const freshToken = await Token.deploy();
      await freshToken.waitForDeployment();
      const GigShield = await ethers.getContractFactory("GigShield");
      const freshGigShield = await GigShield.deploy(
        await freshToken.getAddress(), verifier.address
      );
      await freshGigShield.waitForDeployment();

      await freshGigShield.connect(rider1).registerRider("R1", "Food Delivery");
      await freshToken.connect(owner).mint(rider1.address, ethers.parseEther("1000"));
      await freshToken.connect(rider1).approve(
        await freshGigShield.getAddress(), DAILY_PREMIUM
      );
      await freshGigShield.connect(rider1).activateCoverage(1);
      // No pool funding — premium alone is only 50 GST, payout needs 500 GST

      await expect(
        freshGigShield.connect(verifier).verifyAccidentAndPay(
          GOOD_EVENT_ID, rider1.address, 68n, "Loc", "uri"
        )
      ).to.be.revertedWithCustomError(freshGigShield, "InsufficientPoolFunds");
    });

    it("should reject zero bytes32 as eventId", async function () {
      await expect(
        gigShield.connect(verifier).verifyAccidentAndPay(
          ethers.ZeroHash, rider1.address, 68n, "Loc", "uri"
        )
      ).to.be.revertedWithCustomError(gigShield, "EmptyStringParameter");
    });

    it("should record AccidentRecord on chain after successful verification", async function () {
      await gigShield.connect(verifier).verifyAccidentAndPay(
        GOOD_EVENT_ID, rider1.address, 68n, "MG Road", "ipfs://sensor"
      );
      const record = await gigShield.getAccidentRecord(GOOD_EVENT_ID);
      expect(record.rider).to.equal(rider1.address);
      expect(record.impactSeverity).to.equal(68n);
      expect(record.location).to.equal("MG Road");
    });
  });

  // ─── VIEW FUNCTIONS ─────────────────────────────────────────────────────────

  describe("View Functions", function () {
    it("getPlatformMetrics should return correct values", async function () {
      await setupRiderWithCoverage(rider1, 2);
      const poolFund = ethers.parseEther("5000");
      await token.connect(owner).approve(await gigShield.getAddress(), poolFund);
      await gigShield.connect(owner).fundPayoutPool(poolFund);

      const metrics = await gigShield.getPlatformMetrics();
      const expectedPool = DAILY_PREMIUM * 2n + poolFund;
      expect(metrics[0]).to.equal(expectedPool);
      expect(metrics[1]).to.equal(1n);
      expect(metrics[2]).to.equal(DAILY_PREMIUM * 2n);
      expect(metrics[3]).to.equal(0n);
    });

    it("isRiderRegistered should return correct status", async function () {
      expect(await gigShield.isRiderRegistered(rider1.address)).to.equal(false);
      await gigShield.connect(rider1).registerRider("R1", "Courier/Parcel");
      expect(await gigShield.isRiderRegistered(rider1.address)).to.equal(true);
    });

    it("getRiderCoverageIds should list all coverage IDs for a rider", async function () {
      await gigShield.connect(rider1).registerRider("R1", "Food Delivery");
      await token.connect(owner).mint(rider1.address, ethers.parseEther("500"));
      await token.connect(rider1).approve(await gigShield.getAddress(), DAILY_PREMIUM);
      await gigShield.connect(rider1).activateCoverage(1);

      const ids = await gigShield.getRiderCoverageIds(rider1.address);
      expect(ids.length).to.equal(1);
      expect(ids[0]).to.equal(1n);
    });
  });

  // ─── ADMIN FUNCTIONS ─────────────────────────────────────────────────────────

  describe("Admin Functions", function () {
    it("owner can update authorizedVerifier", async function () {
      await expect(gigShield.connect(owner).setVerifier(stranger.address))
        .to.emit(gigShield, "VerifierUpdated")
        .withArgs(verifier.address, stranger.address);
      expect(await gigShield.authorizedVerifier()).to.equal(stranger.address);
    });

    it("non-owner cannot update verifier", async function () {
      await expect(
        gigShield.connect(stranger).setVerifier(stranger.address)
      ).to.be.revertedWithCustomError(gigShield, "Unauthorized");
    });

    it("owner can update daily premium and payout rates", async function () {
      const newPremium = ethers.parseEther("100");
      const newPayout  = ethers.parseEther("1000");
      await expect(gigShield.connect(owner).setRates(newPremium, newPayout))
        .to.emit(gigShield, "RatesUpdated")
        .withArgs(newPremium, newPayout);
      expect(await gigShield.dailyPremium()).to.equal(newPremium);
      expect(await gigShield.claimPayout()).to.equal(newPayout);
    });
  });
});
