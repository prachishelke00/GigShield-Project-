require("dotenv").config();
const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes/api");

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api", apiRoutes);

app.listen(PORT, () => {
  console.log("==================================================");
  console.log(`  GIGSHIELD ORACLE & API BACKEND SERVICE          `);
  console.log(`  Server listening on: http://localhost:${PORT}   `);
  console.log(`  Network: MST Blockchain Testnet (91562037)      `);
  console.log("==================================================");
});
