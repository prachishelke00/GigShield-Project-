require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
const mainnetPrivateKey = process.env.MAINNET_DEPLOYER_PRIVATE_KEY;

function formatPrivateKey(privateKey) {
  return privateKey ? (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) : "";
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    mstTestnet: {
      url: process.env.MST_TESTNET_RPC || process.env.MST_RPC || "https://testnetrpc.mstblockchain.com",
      chainId: 91562037,
      accounts: deployerPrivateKey ? [formatPrivateKey(deployerPrivateKey)] : [],
    },
    mstMainnet: {
      url: process.env.MAINNET_RPC_URL || "https://mariorpc.mstblockchain.com",
      chainId: 4646,
      accounts: mainnetPrivateKey ? [formatPrivateKey(mainnetPrivateKey)] : [],
    },
  },
};
