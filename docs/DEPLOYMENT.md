# 🚀 GigShield 2.0 — MST Testnet Deployment & Operations Guide

This guide walks through deploying the **GigShield 2.0** parametric accident micro-insurance contract to the **MST Blockchain Testnet**, funding the insurance reserve pool, and running the complete demonstration.

## Deploy the Web App to Vercel

The repository is configured to serve the static frontend from `frontend/`. `POST /api/rider/register` has an explicit Vercel Function route, and the remaining API endpoints use the Express catch-all route. The Vercel build compiles the contracts so their ABI artifacts are bundled with both API functions.

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
5. Deploy or redeploy the Vercel project, then check `https://<your-domain>/api/health`. A successful response confirms the RPC is connected to the configured MST chain ID and reports whether the verifier is configured.
6. Test the registration endpoint with a JSON `POST` to `https://<your-domain>/api/rider/register`. The response is JSON on both success and failure. Successful registration requires the BridgeKey-signed `registerRider` transaction to confirm on-chain before the full rider profile is saved to Redis.

The frontend automatically calls its same-origin `/api` endpoints on Vercel. When running locally, it calls `http://localhost:3001`; run `npm run backend` and `npm start` in separate terminals. Connect BridgeKey to MST Testnet (chain ID `91562037`). Never put a private key in frontend code.

## Prepare a separate MST Mainnet deployment

The Mainnet path is separate from Testnet: RPC `https://mariorpc.mstblockchain.com`, chain ID `4646` (`0x1226`), native currency MSTC (18 decimals), and explorer `https://mstscan.com`. The Mainnet RPC and chain ID were checked against MST's published Mainnet deployment documentation and the RPC's `eth_chainId` response.

**Mainnet deployment is not currently production-ready.** The Testnet `GigShieldToken` has a public faucet that can mint unlimited GST and must not be deployed to Mainnet. The isolated `GigShieldMainnetToken` instead mints a fixed 1,000,000 GST supply at deployment and exposes no faucet or further mint function; this initial supply is an explicit tokenomics choice that should be reviewed before deployment. The full supply is minted to the deployer, so a distribution and payout-pool funding plan is also required. The `GigShield` contract has no ownership-transfer function; its deploying account remains the permanent owner, so design and review an appropriate multisig deployment/ownership approach before deployment. This project also generates simulated accident telemetry; Mainnet simulated accident/payout endpoints remain disabled until a production oracle is reviewed and implemented. The contract's verifier can directly authorize payouts, so secure that role appropriately.

1. Copy the ignored local environment template and edit `.env`:

   ```powershell
   Copy-Item .env.example .env
   ```

   Set `MAINNET_RPC_URL`, `MAINNET_DEPLOYER_PRIVATE_KEY`, and `MAINNET_VERIFIER_ADDRESS` in `.env`. Use a dedicated deployer key, keep `.env` private, and never put a private key in frontend code or Vercel. Do not copy a testnet key into Mainnet settings.
2. Verify the Mainnet RPC without sending a transaction:

   ```powershell
   $body = '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
   Invoke-RestMethod -Uri $env:MAINNET_RPC_URL -Method Post -ContentType 'application/json' -Body $body
   ```

   The result must be `0x1226`.
3. Run the existing tests and compile:

   ```powershell
   npm test
   npm run build
   ```
4. The following command **deploys two contracts and spends real MSTC**. Do not set the confirmation variable or run it until deployment is explicitly approved. The script rechecks chain ID, estimates the combined deployment gas, deploys the fixed-supply Mainnet GST token and GigShield, and writes the separate `frontend/config.mainnet.js`. It does not deploy the demo faucet token, fund a pool, or overwrite Testnet config.

   ```powershell
   $env:MAINNET_DEPLOY_CONFIRM = 'DEPLOY_GIGSHIELD_TO_MST_MAINNET'
   npm run deploy:mainnet
   Remove-Item Env:MAINNET_DEPLOY_CONFIRM
   ```

5. After an approved deployment, verify both printed receipts and explorer records. Set the printed GST and GigShield addresses as `MAINNET_GST_TOKEN_ADDRESS` and `MAINNET_GIGSHIELD_ADDRESS` in the server/Vercel environment. Publish the generated `frontend/config.mainnet.js` with the frontend. Open the dashboard using `dashboard.html?network=mainnet`; normal URLs continue to use Testnet config. Mainnet mode hides the demo faucet.
6. To configure a Mainnet backend later, set `BLOCKCHAIN_NETWORK=mainnet`, `MAINNET_RPC_URL`, `MAINNET_GIGSHIELD_ADDRESS`, and `MAINNET_GST_TOKEN_ADDRESS` in the server/Vercel environment. Mainnet health checks validate chain ID and contract code. Do not enable a Mainnet verifier key or accident payout route until a production oracle and operating controls have been independently reviewed; the current code explicitly rejects simulated payouts on Mainnet.

---

## 🔒 Security Best Practices

1. **NEVER use a mainnet wallet or real funds.**
2. Use a dedicated BridgeKey development account created specifically for testnets and buildathons.
3. Keep private keys only in local `.env` files or Vercel environment settings. Never commit them or place them in frontend code. (Local `.env` is pre-configured in `.gitignore`).

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
2. Connect your wallet using **Connect BridgeKey**.
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
