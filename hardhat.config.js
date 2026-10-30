require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;

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
      accounts: deployerPrivateKey ? [deployerPrivateKey.startsWith("0x") ? deployerPrivateKey : `0x${deployerPrivateKey}`] : [],
    },
  },
};
