require("dotenv").config();
const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes/api");
const { CHAIN_ID, NETWORK_NAME } = require("./config/blockchain");

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api", apiRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ success: false, error: "API endpoint not found." });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = Number.isInteger(error.status) ? error.status : 500;
  res.status(statusCode).json({
    success: false,
    error: statusCode === 400 ? "Invalid JSON request body." : "Internal API error."
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log("==================================================");
    console.log(`  GIGSHIELD ORACLE & API BACKEND SERVICE          `);
    console.log(`  Server listening on: http://localhost:${PORT}   `);
    console.log(`  Network: ${NETWORK_NAME} (${CHAIN_ID})`);
    console.log("==================================================");
  });
}

module.exports = app;
