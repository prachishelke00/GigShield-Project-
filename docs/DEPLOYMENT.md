# 🚀 GigShield 2.0 — MST Testnet Deployment & Operations Guide

This guide walks through deploying the **GigShield 2.0** parametric accident micro-insurance contract to the **MST Blockchain Testnet**, funding the insurance reserve pool, and running the complete demonstration.

## Deploy the Web App to Vercel

The repository is configured to serve the static frontend from `frontend/` and run the Express API as a Vercel Function. The Vercel build compiles the contracts so their ABI artifacts are bundled with the API.

1. Deploy the contracts to MST Testnet with `npm run deploy:mst`. The script updates `frontend/config.js` with the deployed addresses and ABI. Commit and push that generated config change before deploying the web app; Vercel does not deploy contracts for you.
2. Create an Upstash Redis database and copy its REST URL and REST token. Rider profiles require this persistent store because Vercel Functions cannot use the repository JSON file as durable storage.
3. Import the repository into Vercel with the repository root as the project root. Keep the build command as `npm run build` and the output directory as `frontend` (both are set in `vercel.json`).
4. Add these environment variables in the Vercel project settings for every deployment environment you use:

   | Variable | Value |
   |---|---|
   | `MST_RPC` | `https://testnetrpc.mstblockchain.com` or your preferred MST RPC URL |
   | `CHAIN_ID` | `91562037` |
   | `GIGSHIELD_ADDRESS` | Deployed GigShield contract address |
   | `GST_TOKEN_ADDRESS` | Deployed GST token contract address |
   | `VERIFIER_PRIVATE_KEY` | Private key for the authorized testnet verifier wallet |
   | `UPSTASH_REDIS_REST_URL` | Upstash database REST URL |
   | `UPSTASH_REDIS_REST_TOKEN` | Upstash database REST token |

   Keep the verifier key server-side in Vercel settings; never put it in `frontend/config.js` or commit it. `DEPLOYER_PRIVATE_KEY` is used only when deploying contracts and should not be added to Vercel. When the deployed contract's authorized verifier is the deployer wallet, configure that same testnet key as `VERIFIER_PRIVATE_KEY` in Vercel.
5. Deploy or redeploy the Vercel project, then check `https://<your-domain>/api/health`. A successful response reports the MST network and whether the verifier is configured.

The frontend automatically calls its same-origin `/api` endpoints on Vercel. When running locally, it continues to call `http://localhost:3001`; run `npm run backend` and `npm start` in separate terminals.

---

## 🔒 Security Best Practices

1. **NEVER use a mainnet wallet or real funds.**
2. Use a dedicated development account in BridgeKey or MetaMask created specifically for testnets and buildathons.
3. Keep private keys inside `.env` only. Never commit `.env` to Git. (Pre-configured in `.gitignore`).

---

## 🛠️ Step 1: Verified MST Testnet Parameters

| Parameter | Value |
|---|---|
| **Network Name** | MST Blockchain Testnet |
| **RPC Endpoint** | `https://testnetrpc.mstblockchain.com` |
| **Chain ID** | `91562037` (Hex: `0x5752035`) |
| **Native Token** | `tMSTC` (18 Decimals) |
| **Block Explorer** | [https://testnet.mstscan.com](https://testnet.mstscan.com) |
| **Official Faucet** | [https://faucet.mstblockchain.com/](https://faucet.mstblockchain.com/) |

---

## 💧 Step 2: Request Faucet Test Tokens

1. Copy your testnet wallet address (e.g. `0x1234...abcd`).
2. Visit the official MST Faucet: [https://faucet.mstblockchain.com/](https://faucet.mstblockchain.com/)
3. Request test `tMSTC` tokens.

---

## 🔑 Step 3: Configure Environment Variables

1. In the project root, ensure `.env` exists:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Open `.env` and configure your testnet private key:
   ```ini
   MST_RPC="https://testnetrpc.mstblockchain.com"
   DEPLOYER_PRIVATE_KEY="YOUR_TESTNET_PRIVATE_KEY_HERE"
   ```

3. Run the diagnostic check tool to confirm connectivity and balance:
   ```powershell
   npm run check:mst
   ```

---

## 🚢 Step 4: Deploy Contract to MST Testnet

Execute the Hardhat deployment script targeting the MST Testnet:

```powershell
npm run deploy:mst
```

### What this script does automatically:
1. Compiles `contracts/GigShield.sol` with Solidity 0.8.20 optimization.
2. Checks deployer balance and seeds the insurance reserve pool if funds permit (e.g. 0.5 tMSTC).
3. Deploys the contract to MST Testnet.
4. Automatically updates `frontend/config.js` with the real contract address and ABI.
5. Prints the **Contract Address**, **Deployment Tx Hash**, and MSTScan link.

---

## 🌐 Step 5: Start the Frontend Dashboard

Run the local web server:

```powershell
npm start
```

1. Open your browser to **`http://localhost:3000`**.
2. Connect your wallet using **Connect BridgeKey** or **Connect MetaMask**.
3. If connected to another chain, click the network pill to switch to **MST Testnet**.

---

## 💥 Step 6: Test the Micro-Insurance Flow

1. **Seed Pool (If needed):** If the pool reserves show `0.00 tMSTC`, enter `1.0` in the "Insurance Reserve Pool" card and click **Deposit to Pool**.
2. **Activate Shift Protection:** In the purchase card, click **Pay 0.05 tMSTC & Activate Protection**. Confirm in your wallet.
3. **Inspect Active Telemetry:** The **Live Shift Telemetry Monitor** will appear showing your active policy countdown, simulated GPS speed (~42 km/h), and safe G-force (1.2G).
4. **Simulate Crash:** Click **💥 Simulate Road Crash**. Telemetry speed drops to 0 km/h and impact spikes to 6.8G.
5. **Execute Payout:** Click **⚡ Execute Smart-Contract Payout (0.5 tMSTC)**. Confirm in your wallet.
6. **Verify Balance:** Observe your wallet balance increase by `+0.50 tMSTC` and inspect the transaction hash on MSTScan explorer!

---

## 🐍 Step 7: Run Optional Python Telematics Daemon

To demonstrate IoT device compatibility, run the Python 3 daemon in PowerShell:

```powershell
python scripts/simulator.py
```

This simulates a smart helmet telematics device sending sensor telemetry and verifying accident conditions against MST Testnet.
