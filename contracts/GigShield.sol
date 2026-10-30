// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./GigShieldToken.sol";

/**
 * @title GigShield - Parametric Accident Micro-Insurance Protocol for Gig Delivery Riders
 * @notice Complete on-chain micro-insurance architecture: Rider Registration, Premium Payment (GST Token),
 *         Coverage Activation, Accident Verification, and Automated Token Payout.
 *
 * IMPORTANT BUILDATHON DISCLAIMER:
 * GigShield is a simulation prototype deployed on MST Blockchain Testnet.
 * It uses the GigShield Test Token (GST) for demonstration.
 * It does not constitute a legally licensed insurance policy, nor does it handle real fiat currency.
 */
contract GigShield {
    // --- STRUCTS & ENUMS ---

    enum CoverageStatus {
        Inactive,
        Active,
        Claimed,
        Expired
    }

    struct Rider {
        address wallet;
        string nickname;
        string workerCategory; // "Food Delivery", "Grocery Delivery", "Courier/Parcel"
        uint256 registeredAt;
        bool isRegistered;
    }

    struct Coverage {
        uint256 id;
        address rider;
        uint256 startTime;
        uint256 expiryTime;
        uint256 premiumPaid;
        uint256 payoutAmount;
        CoverageStatus status;
        bool hasClaimed;
    }

    struct AccidentRecord {
        bytes32 eventId;
        address rider;
        uint256 coverageId;
        uint256 impactSeverity; // Scaled by 10 (e.g. 68 = 6.8G)
        string location;
        string sensorDataURI;
        uint256 payoutAmount;
        uint256 processedAt;
    }

    // --- CONSTANTS & IMMUTABLES ---

    IERC20 public immutable token; // GST Test Token contract
    uint256 public constant MIN_SEVERITY_THRESHOLD = 40; // 4.0 G-Force impact threshold
    uint256 public constant SECONDS_PER_DAY = 1 days;

    // --- STATE VARIABLES ---

    address public owner;
    address public authorizedVerifier;

    // Configured rates in GST tokens (18 decimals)
    uint256 public dailyPremium = 50 * 10**18;    // 50 GST per day (simulates ₹50/day)
    uint256 public claimPayout = 500 * 10**18;    // 500 GST accident coverage payout

    uint256 public nextCoverageId = 1;
    uint256 public totalPremiumsCollected;
    uint256 public totalPayoutsDisbursed;
    uint256 public totalRidersRegistered;

    // Accounting of payout pool
    uint256 public poolBalance;

    // Reentrancy lock
    uint8 private _locked;

    // --- STORAGE MAPPINGS ---

    mapping(address => Rider) public riders;
    address[] public riderAddresses;

    mapping(uint256 => Coverage) public coverages;
    mapping(address => uint256[]) private _riderCoverageIds;
    mapping(address => uint256) public riderActiveCoverageId;

    mapping(bytes32 => bool) public usedEventIds;
    mapping(bytes32 => AccidentRecord) public accidentRecords;
    bytes32[] public allEventIds;

    // --- EVENTS ---

    event RiderRegistered(
        address indexed rider,
        string nickname,
        string workerCategory,
        uint256 timestamp
    );

    event CoverageActivated(
        uint256 indexed coverageId,
        address indexed rider,
        uint256 startTime,
        uint256 expiryTime,
        uint256 premiumPaid,
        uint256 payoutAmount
    );

    event PayoutPoolFunded(
        address indexed funder,
        uint256 amount,
        uint256 newPoolBalance
    );

    event AccidentVerified(
        bytes32 indexed eventId,
        address indexed rider,
        uint256 impactSeverity,
        string location,
        string sensorDataURI,
        uint256 timestamp
    );

    event PayoutIssued(
        bytes32 indexed eventId,
        address indexed rider,
        uint256 payoutAmount,
        uint256 timestamp
    );

    event VerifierUpdated(address indexed previousVerifier, address indexed newVerifier);
    event RatesUpdated(uint256 newDailyPremium, uint256 newClaimPayout);

    // --- CUSTOM ERRORS ---

    error Unauthorized();
    error ReentrancyAttempt();
    error RiderAlreadyRegistered(address rider);
    error RiderNotRegistered(address rider);
    error EmptyStringParameter();
    error InvalidZeroAmount();
    error InvalidAddress();
    error ActiveCoverageExists(uint256 coverageId, uint256 expiryTime);
    error NoActiveCoverage(address rider);
    error CoverageExpired(uint256 coverageId, uint256 expiryTime, uint256 currentTime);
    error EventAlreadyProcessed(bytes32 eventId);
    error InsufficientSeverity(uint256 reported, uint256 requiredThreshold);
    error InsufficientPoolFunds(uint256 availableInPool, uint256 neededForPayout);
    error TokenTransferFailed(address target, uint256 amount);

    // --- MODIFIERS ---

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyVerifier() {
        if (msg.sender != authorizedVerifier && msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (_locked != 0) revert ReentrancyAttempt();
        _locked = 1;
        _;
        _locked = 0;
    }

    // --- CONSTRUCTOR ---

    constructor(address _tokenAddress, address _initialVerifier) {
        if (_tokenAddress == address(0) || _initialVerifier == address(0)) revert InvalidAddress();
        owner = msg.sender;
        token = IERC20(_tokenAddress);
        authorizedVerifier = _initialVerifier;
        emit VerifierUpdated(address(0), _initialVerifier);
    }

    // --- RIDER REGISTRATION ---

    /**
     * @notice Registers a gig delivery worker on the platform.
     * @param nickname The display name or handle for the rider.
     * @param workerCategory The work type (e.g., "Food Delivery", "Grocery Delivery", "Courier/Parcel").
     */
    function registerRider(string calldata nickname, string calldata workerCategory) external {
        if (riders[msg.sender].isRegistered) {
            revert RiderAlreadyRegistered(msg.sender);
        }
        if (bytes(nickname).length == 0 || bytes(workerCategory).length == 0) {
            revert EmptyStringParameter();
        }

        riders[msg.sender] = Rider({
            wallet: msg.sender,
            nickname: nickname,
            workerCategory: workerCategory,
            registeredAt: block.timestamp,
            isRegistered: true
        });

        riderAddresses.push(msg.sender);
        totalRidersRegistered++;

        emit RiderRegistered(msg.sender, nickname, workerCategory, block.timestamp);
    }

    // --- PREMIUM PAYMENT & COVERAGE ACTIVATION ---

    /**
     * @notice Allows a registered rider to activate accident micro-insurance coverage by paying the GST token premium.
     * @param durationDays Number of days of coverage requested (minimum 1 day).
     */
    function activateCoverage(uint256 durationDays) external nonReentrant returns (uint256 coverageId) {
        if (!riders[msg.sender].isRegistered) {
            revert RiderNotRegistered(msg.sender);
        }
        if (durationDays == 0) revert InvalidZeroAmount();

        // Check if there is already an active non-expired policy
        uint256 existingId = riderActiveCoverageId[msg.sender];
        if (existingId != 0) {
            Coverage storage existing = coverages[existingId];
            if (existing.status == CoverageStatus.Active && block.timestamp < existing.expiryTime) {
                revert ActiveCoverageExists(existingId, existing.expiryTime);
            }
        }

        uint256 totalPremium = dailyPremium * durationDays;

        // Collect premium in GST test tokens from rider
        bool success = token.transferFrom(msg.sender, address(this), totalPremium);
        if (!success) revert TokenTransferFailed(address(this), totalPremium);

        // Update accounting
        poolBalance += totalPremium;
        totalPremiumsCollected += totalPremium;

        coverageId = nextCoverageId++;
        uint256 startTime = block.timestamp;
        uint256 expiryTime = startTime + (durationDays * SECONDS_PER_DAY);

        coverages[coverageId] = Coverage({
            id: coverageId,
            rider: msg.sender,
            startTime: startTime,
            expiryTime: expiryTime,
            premiumPaid: totalPremium,
            payoutAmount: claimPayout,
            status: CoverageStatus.Active,
            hasClaimed: false
        });

        _riderCoverageIds[msg.sender].push(coverageId);
        riderActiveCoverageId[msg.sender] = coverageId;

        emit CoverageActivated(
            coverageId,
            msg.sender,
            startTime,
            expiryTime,
            totalPremium,
            claimPayout
        );
    }

    // --- PAYOUT POOL FUNDING ---

    /**
     * @notice Allows insurers, community sponsors, or buildathon evaluators to deposit GST tokens into the payout pool.
     * @param amount Amount of GST tokens to deposit.
     */
    function fundPayoutPool(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidZeroAmount();

        bool success = token.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TokenTransferFailed(address(this), amount);

        poolBalance += amount;
        emit PayoutPoolFunded(msg.sender, amount, poolBalance);
    }

    // --- ACCIDENT VERIFICATION & AUTOMATIC PAYOUT ---

    /**
     * @notice Verifies an accident event and triggers an automated token payout to the injured rider.
     * @dev Restricted to the authorized backend verifier service.
     * @param eventId Unique identifier generated by the accident telematics detector.
     * @param rider Address of the rider involved in the incident.
     * @param impactSeverity Sensor G-force scaled by 10 (e.g. 68 = 6.8G). Must be >= 40 (4.0G).
     * @param location GPS coordinates or textual description of the incident location.
     * @param sensorDataURI Telemetry logs or sensor metadata string.
     */
    function verifyAccidentAndPay(
        bytes32 eventId,
        address rider,
        uint256 impactSeverity,
        string calldata location,
        string calldata sensorDataURI
    ) external onlyVerifier nonReentrant {
        if (eventId == bytes32(0)) revert EmptyStringParameter();
        if (usedEventIds[eventId]) revert EventAlreadyProcessed(eventId);
        if (!riders[rider].isRegistered) revert RiderNotRegistered(rider);

        uint256 coverageId = riderActiveCoverageId[rider];
        if (coverageId == 0) revert NoActiveCoverage(rider);

        Coverage storage coverage = coverages[coverageId];
        if (coverage.status != CoverageStatus.Active || coverage.hasClaimed) {
            revert NoActiveCoverage(rider);
        }

        if (block.timestamp > coverage.expiryTime) {
            coverage.status = CoverageStatus.Expired;
            revert CoverageExpired(coverageId, coverage.expiryTime, block.timestamp);
        }

        if (impactSeverity < MIN_SEVERITY_THRESHOLD) {
            revert InsufficientSeverity(impactSeverity, MIN_SEVERITY_THRESHOLD);
        }

        uint256 payout = coverage.payoutAmount;
        if (poolBalance < payout || token.balanceOf(address(this)) < payout) {
            revert InsufficientPoolFunds(poolBalance, payout);
        }

        // Checks-Effects-Interactions pattern
        usedEventIds[eventId] = true;
        allEventIds.push(eventId);

        coverage.status = CoverageStatus.Claimed;
        coverage.hasClaimed = true;

        poolBalance -= payout;
        totalPayoutsDisbursed += payout;

        accidentRecords[eventId] = AccidentRecord({
            eventId: eventId,
            rider: rider,
            coverageId: coverageId,
            impactSeverity: impactSeverity,
            location: location,
            sensorDataURI: sensorDataURI,
            payoutAmount: payout,
            processedAt: block.timestamp
        });

        emit AccidentVerified(
            eventId,
            rider,
            impactSeverity,
            location,
            sensorDataURI,
            block.timestamp
        );

        emit PayoutIssued(
            eventId,
            rider,
            payout,
            block.timestamp
        );

        // Execute ERC-20 token transfer
        bool sent = token.transfer(rider, payout);
        if (!sent) revert TokenTransferFailed(rider, payout);
    }

    // --- CONFIGURATION & MANAGEMENT ---

    function setVerifier(address newVerifier) external onlyOwner {
        if (newVerifier == address(0)) revert InvalidAddress();
        address old = authorizedVerifier;
        authorizedVerifier = newVerifier;
        emit VerifierUpdated(old, newVerifier);
    }

    function setRates(uint256 newDailyPremium, uint256 newClaimPayout) external onlyOwner {
        if (newDailyPremium == 0 || newClaimPayout == 0) revert InvalidZeroAmount();
        dailyPremium = newDailyPremium;
        claimPayout = newClaimPayout;
        emit RatesUpdated(newDailyPremium, newClaimPayout);
    }

    // --- VIEW FUNCTIONS ---

    function isRiderRegistered(address rider) external view returns (bool) {
        return riders[rider].isRegistered;
    }

    function getRider(address rider) external view returns (Rider memory) {
        return riders[rider];
    }

    function getRiderCoverageIds(address rider) external view returns (uint256[] memory) {
        return _riderCoverageIds[rider];
    }

    function getCoverage(uint256 coverageId) external view returns (Coverage memory) {
        return coverages[coverageId];
    }

    function getActiveCoverage(address rider) external view returns (bool hasActive, Coverage memory coverage) {
        uint256 activeId = riderActiveCoverageId[rider];
        if (activeId != 0) {
            Coverage memory c = coverages[activeId];
            if (c.status == CoverageStatus.Active && block.timestamp <= c.expiryTime) {
                return (true, c);
            }
        }
        return (false, coverage);
    }

    function getAccidentRecord(bytes32 eventId) external view returns (AccidentRecord memory) {
        return accidentRecords[eventId];
    }

    function getAllEventIds() external view returns (bytes32[] memory) {
        return allEventIds;
    }

    function getPlatformMetrics() external view returns (
        uint256 currentPoolBalance,
        uint256 totalRegisteredRiders,
        uint256 totalPremiums,
        uint256 totalPayouts,
        uint256 currentDailyPremium,
        uint256 currentClaimPayout
    ) {
        return (
            poolBalance,
            totalRidersRegistered,
            totalPremiumsCollected,
            totalPayoutsDisbursed,
            dailyPremium,
            claimPayout
        );
    }
}
