/**
 * GigShield Frontend Application Controller
 * Features:
 * - Strict BridgeKey Wallet Only Integration (EIP-1193)
 * - MST Blockchain Testnet (Chain ID: 91562037)
 * - Multi-Tab Dashboard & State Synchronization
 * - Smart Contract Direct Interactions (Ethers.js v6)
 * - Persistent Backend Rider Profile Synchronization
 * - Dynamic "Registered Riders" Directory Table
 */

(function () {
  "use strict";

  // Application State
  let provider = null;
  let signer = null;
  let userAddress = null;
  let gigShieldContract = null;
  let tokenContract = null;

  let selectedSeverity = 68; // 6.8G
  let activeSimulation = null;

  const CONFIG = window.GIGSHIELD_CONFIG || {};

  // Global Tab Switcher Function
  window.switchTab = function (tabId) {
    document.querySelectorAll(".nav-tab").forEach(tab => {
      if (tab.dataset.tab === tabId) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });

    document.querySelectorAll(".tab-content").forEach(content => {
      if (content.id === tabId) {
        content.classList.add("active");
      } else {
        content.classList.remove("active");
      }
    });

    if (tabId === "tab-riders") {
      fetchRegisteredRiders();
    }
  };

  // DOM Elements
  const connectBridgeKeyBtn = document.getElementById("connectBridgeKeyBtn");
  const walletConnectedCard = document.getElementById("walletConnectedCard");
  const accountDisplay = document.getElementById("accountDisplay");
  const disconnectBtn = document.getElementById("disconnectBtn");
  const tmstcBalance = document.getElementById("tmstcBalance");
  const gstBalance = document.getElementById("gstBalance");
  const networkBadge = document.getElementById("networkBadge");
  const networkText = document.getElementById("networkText");

  // Overview Tab
  const welcomeGreeting = document.getElementById("welcomeGreeting");
  const dashCoverageStatus = document.getElementById("dashCoverageStatus");
  const dashCoverageTimer = document.getElementById("dashCoverageTimer");
  const dashGstBalance = document.getElementById("dashGstBalance");
  const dashPoolBalance = document.getElementById("dashPoolBalance");
  const sidePoolBalance = document.getElementById("sidePoolBalance");
  const overviewRiderBadge = document.getElementById("overviewRiderBadge");
  const unregOverviewBox = document.getElementById("unregOverviewBox");
  const regOverviewBox = document.getElementById("regOverviewBox");
  const overHandle = document.getElementById("overHandle");
  const overCategory = document.getElementById("overCategory");
  const overWallet = document.getElementById("overWallet");
  const overLocation = document.getElementById("overLocation");
  const overRegDate = document.getElementById("overRegDate");
  const overCoverageStatus = document.getElementById("overCoverageStatus");

  // Coverage Tab (Registration Form)
  const riderRegisterForm = document.getElementById("riderRegisterForm");
  const regFullName = document.getElementById("regFullName");
  const regWalletDisplay = document.getElementById("regWalletDisplay");
  const regPhone = document.getElementById("regPhone");
  const regLoc = document.getElementById("regLoc");
  const regCategory = document.getElementById("regCategory");
  const btnSubmitRegister = document.getElementById("btnSubmitRegister");
  const noCoverageNotice = document.getElementById("noCoverageNotice");
  const activeCoverageCard = document.getElementById("activeCoverageCard");
  const polId = document.getElementById("polId");
  const polPremium = document.getElementById("polPremium");
  const polStart = document.getElementById("polStart");
  const polExpiry = document.getElementById("polExpiry");
  const policyTimerBadge = document.getElementById("policyTimerBadge");

  // Registered Riders Tab
  const ridersTableBody = document.getElementById("ridersTableBody");
  const btnRefreshRiders = document.getElementById("btnRefreshRiders");

  // Pay Premium Tab
  const btnClaimFaucet = document.getElementById("btnClaimFaucet");
  const btnApproveGST = document.getElementById("btnApproveGST");
  const selectDays = document.getElementById("selectDays");
  const btnPayAndActivate = document.getElementById("btnPayAndActivate");

  // Simulator Tab
  const simLocation = document.getElementById("simLocation");
  const btnRunSimulation = document.getElementById("btnRunSimulation");
  const simEmptyState = document.getElementById("simEmptyState");
  const simEventBox = document.getElementById("simEventBox");
  const dispSimId = document.getElementById("dispSimId");
  const dispSimG = document.getElementById("dispSimG");
  const dispSimLoc = document.getElementById("dispSimLoc");
  const btnExecutePayout = document.getElementById("btnExecutePayout");
  const receiptBox = document.getElementById("receiptBox");
  const receiptTx = document.getElementById("receiptTx");
  const receiptBlock = document.getElementById("receiptBlock");
  const receiptExplorerLink = document.getElementById("receiptExplorerLink");

  // Claims & History Tabs
  const claimsTableBody = document.getElementById("claimsTableBody");
  const txTableBody = document.getElementById("txTableBody");
  const btnRefreshTx = document.getElementById("btnRefreshTx");

  // Settings Tab
  const settingsAccount = document.getElementById("settingsAccount");
  const settingsTmstc = document.getElementById("settingsTmstc");
  const settingsGst = document.getElementById("settingsGst");

  /**
   * 1. BridgeKey Detection (Strictly no MetaMask)
   */
  function getBridgeKeyProvider() {
    if (window.bridgekey) return window.bridgekey;
    if (window.bridgeKey) return window.bridgeKey;

    if (window.ethereum) {
      if (Array.isArray(window.ethereum.providers)) {
        const bk = window.ethereum.providers.find(p => p.isBridgeKey || p.isMST);
        if (bk) return bk;
      }
      if (window.ethereum.isBridgeKey || window.ethereum.isMST) {
        return window.ethereum;
      }
      if (!window.ethereum.isMetaMask) {
        return window.ethereum;
      }
    }
    return null;
  }

  /**
   * 2. Connect Wallet
   */
  async function connectWallet() {
    try {
      const bkProvider = getBridgeKeyProvider();
      if (!bkProvider) {
        alert(
          "BridgeKey Wallet extension not detected!\n\n" +
          "Please install or enable BridgeKey Wallet for MST Blockchain.\n" +
          "Make sure BridgeKey is unlocked and set as your active provider."
        );
        return;
      }

      if (connectBridgeKeyBtn) {
        connectBridgeKeyBtn.disabled = true;
        connectBridgeKeyBtn.innerText = "Connecting...";
      }

      const accounts = await bkProvider.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No authorized accounts found in BridgeKey.");
      }

      userAddress = accounts[0];
      provider = new ethers.BrowserProvider(bkProvider);
      signer = await provider.getSigner();

      // Check Chain ID
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);

      if (currentChainId !== CONFIG.chainId) {
        if (networkBadge) {
          networkBadge.className = "badge badge-warning";
          networkText.innerText = "Wrong Network";
        }
        await switchNetwork(bkProvider);
      } else {
        if (networkBadge) {
          networkBadge.className = "badge badge-success";
          networkText.innerText = CONFIG.chainName || "MST Testnet";
        }
      }

      // Initialize Contracts
      if (CONFIG.gigShieldAddress && CONFIG.gigShieldAbi) {
        gigShieldContract = new ethers.Contract(CONFIG.gigShieldAddress, CONFIG.gigShieldAbi, signer);
      }
      if (CONFIG.gstTokenAddress && CONFIG.gstTokenAbi) {
        tokenContract = new ethers.Contract(CONFIG.gstTokenAddress, CONFIG.gstTokenAbi, signer);
      }

      // Update UI elements
      if (connectBridgeKeyBtn) connectBridgeKeyBtn.classList.add("hidden");
      if (walletConnectedCard) walletConnectedCard.classList.remove("hidden");
      if (accountDisplay) accountDisplay.innerText = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
      if (settingsAccount) settingsAccount.innerText = userAddress;
      if (regWalletDisplay) regWalletDisplay.value = userAddress;

      // Event listeners
      if (bkProvider.on) {
        bkProvider.on("accountsChanged", (accs) => {
          if (!accs || accs.length === 0) disconnect();
          else {
            userAddress = accs[0];
            if (regWalletDisplay) regWalletDisplay.value = userAddress;
            refreshDashboard();
          }
        });
        bkProvider.on("chainChanged", () => window.location.reload());
      }

      await refreshDashboard();
      await fetchRegisteredRiders();
    } catch (err) {
      console.error("Connect error:", err);
      alert("BridgeKey Connection Error: " + (err.message || err));
      disconnect();
    } finally {
      if (connectBridgeKeyBtn) {
        connectBridgeKeyBtn.disabled = false;
        connectBridgeKeyBtn.innerHTML = `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8 2 2-2 2 2 2-3 3-2-2-3 3"/></svg> Connect BridgeKey`;
      }
    }
  }

  async function switchNetwork(bkProvider) {
    try {
      await bkProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CONFIG.chainIdHex }]
      });
    } catch (err) {
      if (err.code === 4902) {
        await bkProvider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: CONFIG.chainIdHex,
            chainName: CONFIG.chainName,
            nativeCurrency: { name: "tMSTC", symbol: "tMSTC", decimals: 18 },
            rpcUrls: [CONFIG.rpcUrl],
            blockExplorerUrls: [CONFIG.explorerUrl]
          }]
        });
      }
    }
  }

  function disconnect() {
    userAddress = null;
    provider = null;
    signer = null;
    gigShieldContract = null;
    tokenContract = null;

    if (connectBridgeKeyBtn) connectBridgeKeyBtn.classList.remove("hidden");
    if (walletConnectedCard) walletConnectedCard.classList.add("hidden");
    if (accountDisplay) accountDisplay.innerText = "";

    if (welcomeGreeting) welcomeGreeting.innerText = "Welcome, Delivery Rider!";
    if (tmstcBalance) tmstcBalance.innerText = "0.00 tMSTC";
    if (gstBalance) gstBalance.innerText = "0 GST";
    if (dashGstBalance) dashGstBalance.innerText = "0 GST";

    if (overviewRiderBadge) {
      overviewRiderBadge.className = "badge badge-secondary";
      overviewRiderBadge.innerText = "Not Registered";
    }
    if (unregOverviewBox) unregOverviewBox.classList.remove("hidden");
    if (regOverviewBox) regOverviewBox.classList.add("hidden");

    if (dashCoverageStatus) {
      dashCoverageStatus.innerText = "Inactive";
      dashCoverageStatus.className = "metric-val status-text";
    }
    if (dashCoverageTimer) dashCoverageTimer.innerText = "No policy active";

    if (noCoverageNotice) noCoverageNotice.classList.remove("hidden");
    if (activeCoverageCard) activeCoverageCard.classList.add("hidden");

    if (claimsTableBody) claimsTableBody.innerHTML = `<tr><td colspan="4" class="empty-table">Connect BridgeKey wallet to view claims</td></tr>`;
    if (txTableBody) txTableBody.innerHTML = `<tr><td colspan="5" class="empty-table">Connect BridgeKey wallet to view history</td></tr>`;
  }

  /**
   * 3. Refresh Dashboard & Synchronize Profile Data
   */
  async function refreshDashboard() {
    if (!userAddress || !provider) return;

    try {
      // 1. Gas (tMSTC)
      const balanceWei = await provider.getBalance(userAddress);
      const tmstcFormatted = parseFloat(ethers.formatEther(balanceWei)).toFixed(3);
      if (tmstcBalance) tmstcBalance.innerText = `${tmstcFormatted} tMSTC`;
      if (settingsTmstc) settingsTmstc.innerText = `${tmstcFormatted} tMSTC`;

      // 2. GST Token Balance
      if (tokenContract) {
        const gstWei = await tokenContract.balanceOf(userAddress);
        const gstFormatted = parseFloat(ethers.formatEther(gstWei)).toFixed(0);
        if (gstBalance) gstBalance.innerText = `${gstFormatted} GST`;
        if (dashGstBalance) dashGstBalance.innerText = `${gstFormatted} GST`;
        if (settingsGst) settingsGst.innerText = `${gstFormatted} GST`;
      }

      // 3. Platform Pool Metrics
      if (gigShieldContract) {
        const metrics = await gigShieldContract.getPlatformMetrics();
        const poolFormatted = parseFloat(ethers.formatEther(metrics[0])).toFixed(0) + " GST";
        if (dashPoolBalance) dashPoolBalance.innerText = poolFormatted;
        if (sidePoolBalance) sidePoolBalance.innerText = poolFormatted;
      }

      // 4. Fetch Rider Profile from Backend Database + Blockchain
      let currentCoverageStatus = "Inactive";

      // First check active coverage
      if (gigShieldContract) {
        const [hasActive, cov] = await gigShieldContract.getActiveCoverage(userAddress);
        if (hasActive) {
          const nowSec = Math.floor(Date.now() / 1000);
          const diffSec = Number(cov.expiryTime) - nowSec;

          if (diffSec > 0) {
            currentCoverageStatus = "Active";
            const hrs = Math.floor(diffSec / 3600);
            const mins = Math.floor((diffSec % 3600) / 60);
            const timerStr = `${hrs}h ${mins}m remaining`;

            if (dashCoverageStatus) {
              dashCoverageStatus.innerText = "Active";
              dashCoverageStatus.className = "metric-val status-text text-success";
            }
            if (dashCoverageTimer) dashCoverageTimer.innerText = timerStr;
            if (policyTimerBadge) policyTimerBadge.innerText = timerStr;
          } else {
            currentCoverageStatus = "Expired";
            if (dashCoverageStatus) dashCoverageStatus.innerText = "Expired";
            if (dashCoverageTimer) dashCoverageTimer.innerText = "Coverage expired";
          }

          if (noCoverageNotice) noCoverageNotice.classList.add("hidden");
          if (activeCoverageCard) activeCoverageCard.classList.remove("hidden");

          if (polId) polId.innerText = `#${cov.id}`;
          if (polPremium) polPremium.innerText = `${ethers.formatEther(cov.premiumPaid)} GST`;
          if (polStart) polStart.innerText = new Date(Number(cov.startTime) * 1000).toLocaleString();
          if (polExpiry) polExpiry.innerText = new Date(Number(cov.expiryTime) * 1000).toLocaleString();
        } else {
          if (dashCoverageStatus) {
            dashCoverageStatus.innerText = "Inactive";
            dashCoverageStatus.className = "metric-val status-text";
          }
          if (dashCoverageTimer) dashCoverageTimer.innerText = "No policy active";
          if (noCoverageNotice) noCoverageNotice.classList.remove("hidden");
          if (activeCoverageCard) activeCoverageCard.classList.add("hidden");
        }
      }

      // Query backend for rider info
      try {
        const res = await fetch(`${CONFIG.backendUrl || "http://localhost:3001"}/api/rider/${userAddress}`);
        const riderData = await res.json();

        if (riderData && riderData.isRegistered) {
          const displayName = riderData.fullName || riderData.nickname || "Delivery Rider";

          // Update Welcome Greeting
          if (welcomeGreeting) {
            welcomeGreeting.innerText = `Welcome, ${displayName}!`;
          }

          // Update Status Badge
          if (overviewRiderBadge) {
            overviewRiderBadge.className = "badge badge-success";
            overviewRiderBadge.innerHTML = `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg> Registered Rider`;
          }

          // Show Profile Box
          if (unregOverviewBox) unregOverviewBox.classList.add("hidden");
          if (regOverviewBox) regOverviewBox.classList.remove("hidden");

          if (overHandle) overHandle.innerText = displayName;
          if (overCategory) overCategory.innerText = riderData.workerCategory || "Food Delivery";
          if (overWallet) overWallet.innerText = `${userAddress.slice(0, 8)}...${userAddress.slice(-6)}`;
          if (overLocation) overLocation.innerText = riderData.location || "Bengaluru";
          if (overRegDate) overRegDate.innerText = new Date(riderData.registeredAt).toLocaleDateString();

          if (overCoverageStatus) {
            overCoverageStatus.innerText = currentCoverageStatus;
            overCoverageStatus.className = `badge ${currentCoverageStatus === "Active" ? "badge-success" : (currentCoverageStatus === "Expired" ? "badge-warning" : "badge-secondary")}`;
          }
        } else {
          if (welcomeGreeting) welcomeGreeting.innerText = "Welcome, Delivery Rider!";
          if (overviewRiderBadge) {
            overviewRiderBadge.className = "badge badge-secondary";
            overviewRiderBadge.innerText = "Not Registered";
          }
          if (unregOverviewBox) unregOverviewBox.classList.remove("hidden");
          if (regOverviewBox) regOverviewBox.classList.add("hidden");
        }
      } catch (backendErr) {
        console.warn("Backend profile sync warning:", backendErr);
      }

      await loadTransactionsAndClaims();
    } catch (err) {
      console.warn("Dashboard refresh notice:", err);
    }
  }

  /**
   * 4. Fetch and Render Registered Riders Table (Dynamic Backend Data)
   */
  async function fetchRegisteredRiders() {
    if (!ridersTableBody) return;

    try {
      const res = await fetch(`${CONFIG.backendUrl || "http://localhost:3001"}/api/riders`);
      const data = await res.json();

      if (!data.success || !data.riders || data.riders.length === 0) {
        ridersTableBody.innerHTML = `<tr><td colspan="7" class="empty-table">No riders registered in the network yet. Be the first to register!</td></tr>`;
        return;
      }

      ridersTableBody.innerHTML = data.riders.map(r => {
        const isCurrent = userAddress && r.walletAddress.toLowerCase() === userAddress.toLowerCase();
        const shortAddr = `${r.walletAddress.slice(0, 6)}...${r.walletAddress.slice(-4)}`;
        const regDateStr = new Date(r.registeredAt).toLocaleDateString();
        const statusBadge = r.coverageStatus === "Active" ? "badge-success" : (r.coverageStatus === "Expired" ? "badge-warning" : "badge-secondary");

        return `
          <tr ${isCurrent ? 'style="background-color: rgba(56, 189, 248, 0.05);"' : ''}>
            <td>
              <strong>${r.fullName || "Anonymous Rider"}</strong>
              ${isCurrent ? ' <span class="badge badge-accent">You</span>' : ''}
            </td>
            <td class="mono-text">
              <a href="https://testnet.mstscan.com/address/${r.walletAddress}" target="_blank" title="${r.walletAddress}">
                ${shortAddr} ↗
              </a>
            </td>
            <td>${r.workerCategory} <span class="text-muted text-sm">(${r.location || "Global"})</span></td>
            <td>${regDateStr}</td>
            <td><span class="badge ${statusBadge}">${r.coverageStatus}</span></td>
            <td>${r.totalClaims}</td>
            <td class="highlight-token">${r.totalPayouts}</td>
          </tr>
        `;
      }).join("");
    } catch (err) {
      console.warn("Error fetching registered riders:", err);
      ridersTableBody.innerHTML = `<tr><td colspan="7" class="empty-table text-danger">Failed to load riders directory. Verify backend is running.</td></tr>`;
    }
  }

  /**
   * 5. Actions: Registration, Faucet, Allowance, Activate
   */
  if (riderRegisterForm) {
    riderRegisterForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!userAddress) return alert("Please connect BridgeKey wallet first.");

      const fullName = regFullName.value.trim();
      const phone = regPhone ? regPhone.value.trim() : "";
      const loc = regLoc ? regLoc.value.trim() : "";
      const category = regCategory.value;

      if (!fullName) {
        return alert("Please enter your full name.");
      }

      try {
        btnSubmitRegister.disabled = true;
        btnSubmitRegister.innerText = "Saving Profile & Confirming On-Chain...";

        // 1. Save profile to Backend JSON Database
        const backendRes = await fetch(`${CONFIG.backendUrl || "http://localhost:3001"}/api/rider/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: fullName,
            walletAddress: userAddress,
            phoneNumber: phone,
            location: loc,
            workerCategory: category
          })
        });

        const backendData = await backendRes.json();
        if (!backendData.success) {
          throw new Error(backendData.error || "Failed to save profile to database");
        }

        // 2. Perform on-chain registration if not already registered on-chain
        if (gigShieldContract) {
          const isAlreadyOnChain = await gigShieldContract.isRiderRegistered(userAddress);
          if (!isAlreadyOnChain) {
            btnSubmitRegister.innerText = "Confirm in BridgeKey Extension...";
            const tx = await gigShieldContract.registerRider(fullName, category);
            btnSubmitRegister.innerText = "Mining On-Chain Profile...";
            await tx.wait();
          }
        }

        alert(`Registration successful!\n\nWelcome to GigShield, ${fullName}. Your profile has been stored and linked to wallet ${userAddress.slice(0, 8)}...`);

        // Refresh UI dynamically without page reload
        await refreshDashboard();
        await fetchRegisteredRiders();
        switchTab("tab-overview");
      } catch (err) {
        console.error("Registration error:", err);
        alert("Registration failed: " + (err.reason || err.message));
      } finally {
        btnSubmitRegister.disabled = false;
        btnSubmitRegister.innerText = "Register On-Chain Profile";
      }
    });
  }

  if (btnClaimFaucet) {
    btnClaimFaucet.addEventListener("click", async () => {
      if (!tokenContract || !userAddress) return alert("Connect BridgeKey wallet first.");

      try {
        btnClaimFaucet.disabled = true;
        btnClaimFaucet.innerText = "Dispensing 500 GST...";
        const tx = await tokenContract.requestDemoTokens(userAddress);
        await tx.wait();
        alert("500 GST demo tokens received!");
        await refreshDashboard();
      } catch (err) {
        alert("Faucet failed: " + (err.reason || err.message));
      } finally {
        btnClaimFaucet.disabled = false;
        btnClaimFaucet.innerHTML = `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12v9H4v-9m-2-5h20v5H2zm10 0v14m0-14H7.5a2.5 2.5 0 1 1 2.5-2.5C10 6 12 7 12 7Zm0 0h4.5A2.5 2.5 0 1 0 14 4.5C14 6 12 7 12 7Z"/></svg> Claim 500 GST`;
      }
    });
  }

  if (btnApproveGST) {
    btnApproveGST.addEventListener("click", async () => {
      if (!tokenContract || !CONFIG.gigShieldAddress) return alert("Connect BridgeKey wallet first.");

      try {
        btnApproveGST.disabled = true;
        btnApproveGST.innerText = "Confirming Approval...";
        const amount = ethers.parseEther("10000");
        const tx = await tokenContract.approve(CONFIG.gigShieldAddress, amount);
        await tx.wait();
        alert("GigShield smart contract approved to collect micro-premiums!");
        await refreshDashboard();
      } catch (err) {
        alert("Approval failed: " + (err.reason || err.message));
      } finally {
        btnApproveGST.disabled = false;
        btnApproveGST.innerHTML = `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/></svg> Approve Allowance`;
      }
    });
  }

  if (btnPayAndActivate) {
    btnPayAndActivate.addEventListener("click", async () => {
      if (!gigShieldContract) return alert("Connect BridgeKey wallet first.");

      try {
        btnPayAndActivate.disabled = true;
        btnPayAndActivate.innerText = "Activating on MST...";
        const days = parseInt(selectDays.value, 10);
        const tx = await gigShieldContract.activateCoverage(days);
        await tx.wait();
        alert(`${days}-day accident micro-insurance activated successfully!`);
        await refreshDashboard();
        await fetchRegisteredRiders();
        switchTab("tab-overview");
      } catch (err) {
        alert("Activation failed: " + (err.reason || err.message));
      } finally {
        btnPayAndActivate.disabled = false;
        btnPayAndActivate.innerHTML = `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/></svg> Pay Premium & Activate Policy`;
      }
    });
  }

  /**
   * 6. Telematics Simulation & Automated Payout
   */
  document.querySelectorAll(".btn-gchip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".btn-gchip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      selectedSeverity = Math.round(parseFloat(chip.dataset.g) * 10);
    });
  });

  if (btnRunSimulation) {
    btnRunSimulation.addEventListener("click", async () => {
      if (!userAddress) return alert("Connect BridgeKey wallet first.");

      try {
        btnRunSimulation.disabled = true;
        btnRunSimulation.innerText = "Simulating Sensor Signal...";

        const res = await fetch(`${CONFIG.backendUrl || "http://localhost:3001"}/api/accident/simulate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            riderAddress: userAddress,
            customSeverity: selectedSeverity,
            customLocation: simLocation ? simLocation.value : "Bengaluru"
          })
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        activeSimulation = data;

        if (simEmptyState) simEmptyState.classList.add("hidden");
        if (simEventBox) simEventBox.classList.remove("hidden");
        if (dispSimId) dispSimId.innerText = `${data.eventId.slice(0, 16)}...`;
        if (dispSimG) dispSimG.innerText = data.impactSeverityDisplay;
        if (dispSimLoc) dispSimLoc.innerText = data.location;
      } catch (err) {
        alert("Simulation error: " + err.message + "\nEnsure backend is running on port 3001 (`npm run backend`).");
      } finally {
        btnRunSimulation.disabled = false;
        btnRunSimulation.innerHTML = `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v2m6.4.6-1.4 1.4M21 12h-2m-2.6 6.4-1.4-1.4M12 21v-2m-6.4-2.6 1.4-1.4M3 12h2m2.6-6.4 1.4 1.4"/><circle cx="12" cy="12" r="5"/></svg> Trigger Simulated Telematics Signal`;
      }
    });
  }

  if (btnExecutePayout) {
    btnExecutePayout.addEventListener("click", async () => {
      if (!activeSimulation) return alert("Simulate an accident signal first.");

      try {
        btnExecutePayout.disabled = true;
        btnExecutePayout.innerText = "Oracle Verifying & Transferring Payout...";

        const res = await fetch(`${CONFIG.backendUrl || "http://localhost:3001"}/api/accident/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: activeSimulation.eventId,
            riderAddress: userAddress,
            impactSeverity: activeSimulation.impactSeverity,
            location: activeSimulation.location,
            sensorDataURI: activeSimulation.sensorDataURI
          })
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        if (receiptBox) receiptBox.classList.remove("hidden");
        if (receiptTx) receiptTx.innerText = `${data.txHash.slice(0, 16)}...${data.txHash.slice(-8)}`;
        if (receiptBlock) receiptBlock.innerText = `#${data.blockNumber}`;
        if (receiptExplorerLink) receiptExplorerLink.href = data.explorerUrl;

        alert("500 GST Payout successfully executed on MST Blockchain!");
        await refreshDashboard();
        await fetchRegisteredRiders();
      } catch (err) {
        alert("Oracle Verification Failed: " + err.message);
      } finally {
        btnExecutePayout.disabled = false;
        btnExecutePayout.innerHTML = `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/></svg> Execute Smart Contract Payout (500 GST)`;
      }
    });
  }

  /**
   * 7. Transaction & Claim Queries
   */
  async function loadTransactionsAndClaims() {
    if (!gigShieldContract || !userAddress) return;

    try {
      const filterActivated = gigShieldContract.filters.CoverageActivated(null, userAddress);
      const filterPayout = gigShieldContract.filters.PayoutIssued(null, userAddress);

      const [activatedEvents, payoutEvents] = await Promise.all([
        gigShieldContract.queryFilter(filterActivated, -5000),
        gigShieldContract.queryFilter(filterPayout, -5000)
      ]);

      // Claims Table
      if (claimsTableBody) {
        if (payoutEvents.length === 0) {
          claimsTableBody.innerHTML = `<tr><td colspan="4" class="empty-table">No claims disbursed for this wallet yet.</td></tr>`;
        } else {
          claimsTableBody.innerHTML = payoutEvents.map(e => `
            <tr>
              <td class="mono-text">${e.args[0].slice(0, 14)}...</td>
              <td class="highlight-token">+${ethers.formatEther(e.args[2])} GST</td>
              <td class="mono-text"><a href="https://testnet.mstscan.com/tx/${e.transactionHash}" target="_blank">${e.transactionHash.slice(0, 10)}... ↗</a></td>
              <td><span class="badge badge-success">Disbursed</span></td>
            </tr>
          `).join("");
        }
      }

      // History Table
      if (txTableBody) {
        const history = [];

        activatedEvents.forEach(e => {
          history.push({
            action: "Coverage Activated",
            amount: `${ethers.formatEther(e.args[4])} GST`,
            details: `Policy #${e.args[0]}`,
            block: e.blockNumber,
            status: "Active"
          });
        });

        payoutEvents.forEach(e => {
          history.push({
            action: "Accident Claim Payout",
            amount: `+${ethers.formatEther(e.args[2])} GST`,
            details: `Event ${e.args[0].slice(0, 10)}...`,
            block: e.blockNumber,
            status: "Paid"
          });
        });

        if (history.length === 0) {
          txTableBody.innerHTML = `<tr><td colspan="5" class="empty-table">No on-chain activity recorded yet.</td></tr>`;
        } else {
          history.sort((a, b) => b.block - a.block);
          txTableBody.innerHTML = history.map(h => `
            <tr>
              <td><strong>${h.action}</strong></td>
              <td class="${h.action.includes('Payout') ? 'severe-text' : ''}">${h.amount}</td>
              <td>${h.details}</td>
              <td>#${h.block}</td>
              <td><span class="badge ${h.status === 'Paid' ? 'badge-success' : 'badge-info'}">${h.status}</span></td>
            </tr>
          `).join("");
        }
      }
    } catch (err) {
      console.warn("Tx query warning:", err);
    }
  }

  // Navigation tab click listeners
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  if (connectBridgeKeyBtn) connectBridgeKeyBtn.addEventListener("click", connectWallet);
  if (disconnectBtn) disconnectBtn.addEventListener("click", disconnect);
  if (btnRefreshTx) btnRefreshTx.addEventListener("click", refreshDashboard);
  if (btnRefreshRiders) btnRefreshRiders.addEventListener("click", fetchRegisteredRiders);

  // Initial load
  window.addEventListener("DOMContentLoaded", () => {
    fetchRegisteredRiders();
    const bk = getBridgeKeyProvider();
    if (bk && bk.selectedAddress) {
      connectWallet();
    }
  });

})();
