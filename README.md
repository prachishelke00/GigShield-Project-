# GigShield 2.0 — Parametric Accident Micro-Insurance on MST Blockchain

> **Buildathon MVP Prototype** designed for gig delivery workers (food delivery, grocery delivery, parcel courier riders).  
> Built strictly for **BridgeKey Wallet** and **MST Blockchain Testnet (Chain ID: 91562037)** using **GigShield Test Tokens (GST)**.

---

## 🚀 Key Highlights & Architecture

1. **Dual Smart Contract Architecture**:
   - [`contracts/GigShieldToken.sol`](contracts/GigShieldToken.sol): Standard ERC-20 (`GST`) test token with an open demo faucet dispensing 500 GST for buildathon demonstrations.
   - [`contracts/GigShield.sol`](contracts/GigShield.sol): Parametric micro-insurance protocol managing rider profiles, daily premium collection (50 GST / day), automated crash validation (≥ 4.0G), and automated smart contract payouts (500 GST).

2. **Strict BridgeKey Wallet Integration**:
   - Zero MetaMask dependencies or remnants.
   - Tailored EIP-1193 discovery prioritizing BridgeKey's native browser provider, network switching to MST Testnet (`0x5752035`), and automatic state handling.

3. **Backend Oracle & Verification Service**:
   - [`backend/server.js`](backend/server.js): Express.js verification engine. Securely holds the verifier private key server-side to sign and dispatch `verifyAccidentAndPay()` on-chain.

4. **Telematics IoT Simulator**:
   - Realistic crash impact generation (G-force accelerometer vectors & gyroscope rotation) that sends cryptographic event proofs to the verification engine.

---

## 🛠️ Quickstart Guide

### 1. Prerequisites
- Node.js (v18+ recommended)
- [BridgeKey Wallet](https://chromewebstore.google.com/) browser extension installed
- Free testnet gas tokens (`tMSTC`) from the [MST Faucet](https://faucet.mstblockchain.com/)

### 2. Install & Run Tests
```bash
# Run the 44-test automated test suite
npm test
```

### 3. Start the Backend Verification Oracle
```bash
npm run backend
```
*Runs on `http://localhost:3001`.*

### 4. Launch the Frontend
```bash
npm start
```
*Opens the GigShield DApp on `http://localhost:3000`.*

---

## 📋 End-to-End Buildathon Demonstration Flow

1. **Connect BridgeKey**: Click `Connect BridgeKey Wallet` in the top right.
2. **Register Rider**: Enter rider handle (e.g., *Arjun Fleet*) and work category (*Food Delivery*).
3. **Claim Test Tokens**: Click `Claim 500 GST Demo Tokens` to receive demo tokens from the GST faucet.
4. **Approve & Activate Coverage**: Click `Approve GigShield Allowance`, then `Activate Coverage Now` for 1 day (50 GST).
5. **Simulate Accident**: Select `6.8G (Severe Crash)` and click `Simulate Crash Telematics Signal`.
6. **Instant Payout**: Click `Execute Automated Payout (500 GST)`. The oracle validates telemetry and deposits 500 GST into your wallet with an on-chain transaction receipt!

---

*Disclaimer: GigShield is an educational Web3 buildathon prototype using simulated test tokens on MST Blockchain Testnet. It does not handle real currency or legal insurance contracts.*
