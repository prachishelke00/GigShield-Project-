# GigShield System Architecture

```
+-----------------------------------------------------------------------------------+
|                                 GIGSHIELD PROTOCOL                                |
+-----------------------------------------------------------------------------------+

     +-----------------------+                    +------------------------+
     |   BridgeKey Wallet    |                    |  Delivery Rider Phone  |
     | (EIP-1193 / MST Net)  |                    | (Telematics Sensor UI) |
     +-----------+-----------+                    +------------+-----------+
                 |                                             |
                 | (1) Sign Tx                                 | (5) Crash Event
                 v                                             v
     +-----------------------+                    +------------------------+
     |  GigShield Frontend   |                    | GigShield Node Backend |
     | (HTML5 / CSS3 / ES6)  +------------------->|  (Express Oracle API)  |
     +-----------+-----------+   (4) Simulate     +------------+-----------+
                 |                                             |
                 | (2) Register & Premium                      | (6) verifyAccidentAndPay
                 v                                             v
+-----------------------------------------------------------------------------------+
|                        MST BLOCKCHAIN TESTNET (91562037)                          |
|                                                                                   |
|  +---------------------------+             +----------------------------------+   |
|  |   GigShieldToken (GST)    |             |       GigShield Protocol         |   |
|  |         (ERC-20)          |<------------+     (Micro-Insurance Core)       |   |
|  | - Faucet: 500 GST         | (3) Collect | - Rider Registry                 |   |
|  | - Total Supply: 1,000,000 |   Premium   | - Daily Coverage (50 GST/day)    |   |
|  |                           +------------>| - Crash Threshold: >= 4.0G       |   |
|  |                           | (7) Transfer| - Instant Payout: 500 GST        |   |
|  |                           |   500 GST   | - Reentrancy Guard (CEI)         |   |
|  +---------------------------+             +----------------------------------+   |
+-----------------------------------------------------------------------------------+
```

## Component Overview

1. **Frontend**:
   - `index.html`: Marketing & product landing page detailing the gig worker safety problem, how it works, and platform features.
   - `dashboard.html`: Full-featured Web3 insurance dashboard with Overview, My Coverage, Pay Premium, Accident Simulator, My Claims, and On-chain Transaction History.
   - `script.js` & `css/style.css`: Client-side state synchronization, ethers.js v6 contract bindings, and BridgeKey provider listener.

2. **Backend**:
   - `backend/server.js`: Express server on port 3001.
   - `backend/routes/api.js`: REST endpoints for health checks, rider inquiries, simulated sensor generation, and oracle transaction dispatch.
   - `backend/services/verificationService.js`: Sensor telemetry validator checking peak impact intensity ($\ge 4.0\text{G}$) before calling the contract.

3. **Smart Contracts**:
   - `contracts/GigShieldToken.sol`: Standard ERC-20 test token powering premiums and claim disbursements. Includes a public demo faucet.
   - `contracts/GigShield.sol`: The core parametric insurance smart contract deployed on MST Blockchain Testnet.

