window.GIGSHIELD_MAINNET_CONFIG = {
  network: "MST Mainnet",
  mainnetReady: false,
  productionOracleReady: false,
  chainId: 4646,
  chainIdHex: "0x1226",
  chainName: "MST Mainnet",
  nativeCurrency: { name: "MSTC", symbol: "MSTC", decimals: 18 },
  rpcUrl: "https://mariorpc.mstblockchain.com",
  explorerUrl: "https://mstscan.com",
  backendUrl: window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3001"
    : window.location.origin,
  gigShieldAddress: "",
  gstTokenAddress: "",
  gigShieldAbi: [],
  gstTokenAbi: []
};
