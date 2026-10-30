require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

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
      url: process.env.MST_TESTNET_RPC || "https://testnetrpc.mstblockchain.com",
      chainId: 91562037,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY.startsWith("0x") ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`] : [],
    },
  },
};

