# GigShield Buildathon Demonstration Script (2–3 Minutes)

## Presentation Objective
Demonstrate the live end-to-end workflow of **GigShield**, an automated accident micro-insurance protocol built for gig delivery riders on MST Blockchain.

---

### Step 1: Problem & Pitch (30 seconds)
> *"Hello judges! Delivery riders log 12 hours a day on hazardous roads to earn daily variable wages, but traditional accident insurance is broken for them: premiums are expensive annual lumpsums, and claims take weeks of paperwork. GigShield solves this with Web3 parametric micro-insurance. Riders pay a micro-premium of ₹50/day (50 GST), and an on-chain smart contract automatically pays out 500 GST if a crash is detected by bike telematics."*

### Step 2: Landing Page & Connect BridgeKey (30 seconds)
1. Open `http://localhost:3000` (shows the clean dark navy & electric blue fintech landing page).
2. Click **Launch Dashboard ↗**.
3. Point out the wallet button: *"We support BridgeKey Wallet exclusively, connected directly to the MST Blockchain Testnet."*
4. Click **Connect BridgeKey**. Point out the balance pill showing native `tMSTC` and `GST` test tokens.

### Step 3: Registration & Daily Premium (45 seconds)
1. In the **My Coverage** tab:
   - Fill in handle: `Rahul Fleet Rider`
   - Select: `Food Delivery (Zomato/Swiggy)`
   - Click **Register On-Chain Profile** & approve in BridgeKey.
2. In the **Pay Premium** tab:
   - Click **Claim 500 GST** (faucet dispenses test tokens).
   - Click **Approve Allowance**.
   - Select **1 Day — 50 GST** and click **Pay Premium & Activate Policy**.
3. Show the **Overview** tab: The card now shows **● Active** with a live countdown timer!

### Step 4: Crash Simulation & Instant Payout (45 seconds)
1. Navigate to **Accident Simulator**:
   - Point out the G-force selector.
   - Choose **6.8G (Severe Crash)**.
   - Click **Trigger Simulated Telematics Signal**.
   - Show the generated telemetry packet with event ID, G-force vectors, and GPS coordinates.
2. Click **Execute Smart Contract Payout (500 GST)**:
   - The backend oracle validates the crash and calls `verifyAccidentAndPay()` on MST Blockchain.
   - Show the confirmation card: *"500 GST Transferred!"* with the actual block number and MSTScan explorer link.
3. Switch to **My Claims** and **Transaction History**:
   - Show the newly recorded on-chain claim payout and updated wallet balance.

### Conclusion (15 seconds)
> *"No paperwork, no adjusters, no waiting. True parametric insurance powered by MST Blockchain. Thank you!"*
