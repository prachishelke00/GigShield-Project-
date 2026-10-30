# GigShield Security & Threat Model

## 1. Smart Contract Protections

- **Checks-Effects-Interactions (CEI)**: State transitions (marking coverage as claimed, deducting from liquidity balance) always happen strictly *before* external token transfers.
- **Custom Errors**: Replaced legacy revert strings with gas-optimized Solidity custom errors (`RiderAlreadyRegistered`, `NoActiveCoverage`, `InsufficientSeverity`, `InsufficientPoolFunds`).
- **Reentrancy Protection**: Explicit state mutex lock (`nonReentrant` modifier) prevents reentrant attacks on payout transfers and pool funding.
- **Access Control**:
  - `onlyOwner`: Restricts administrative configuration (oracle address, rate changes) to the contract deployer.
  - `onlyVerifier`: Restricts crash verification and payout execution to the trusted backend verifier or owner.
- **Duplicate Prevention**: Every crash simulation generates a cryptographically unique `bytes32 eventId` stored in a public mapping (`usedEventIds`). Attempting to replay an event reverts with `EventAlreadyProcessed`.

## 2. Key Management & Sensitive Data

- **Private Key Isolation**: The verifier private key is stored exclusively in `backend/.env` and read by Node.js. It is never bundled into frontend scripts or exposed via client-side endpoints.
- **Client Security**: Riders sign transactions strictly through their BridgeKey browser wallet. The DApp never asks for, reads, or stores seed phrases or private keys.

## 3. Parametric Sensor Trust Model

- In this buildathon MVP, the IoT telemetry packet is simulated client-side/server-side to demonstrate the instant payout mechanism.
- For production, an authenticated hardware enclave (e.g., tamper-proof bike sensor unit with ECDSA signing keys) or decentralized oracle network (e.g., Chainlink Functions / Telematics Oracles) would directly attest to crash force data.

