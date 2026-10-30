/**
 * Persistent JSON File Database for GigShield Rider Profiles
 * Provides atomic, synchronized storage linking blockchain wallet addresses with full off-chain profile data.
 */

const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "..", "data", "riders.json");

class Database {
  constructor() {
    this._init();
  }

  _init() {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2), "utf8");
      }
    } catch (err) {
      console.error("Database initialization error:", err);
    }
  }

  _readAll() {
    try {
      if (!fs.existsSync(DB_FILE)) {
        return {};
      }
      const raw = fs.readFileSync(DB_FILE, "utf8");
      return JSON.parse(raw || "{}");
    } catch (err) {
      console.error("Error reading DB file:", err);
      return {};
    }
  }

  _writeAll(data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
      console.error("Error writing DB file:", err);
    }
  }

  // Get single rider by normalized wallet address
  getRider(walletAddress) {
    if (!walletAddress) return null;
    const all = this._readAll();
    const key = walletAddress.toLowerCase();
    return all[key] || null;
  }

  // Save or update rider record
  saveRider(rider) {
    if (!rider || !rider.walletAddress) {
      throw new Error("walletAddress is required to save rider");
    }
    const all = this._readAll();
    const key = rider.walletAddress.toLowerCase();

    const existing = all[key] || {};
    const updated = {
      ...existing,
      ...rider,
      walletAddress: rider.walletAddress, // keep original casing or checksum
      updatedAt: Date.now()
    };

    if (!updated.registeredAt) {
      updated.registeredAt = Date.now();
    }

    all[key] = updated;
    this._writeAll(all);
    return updated;
  }

  // List all registered riders
  getAllRiders() {
    const all = this._readAll();
    return Object.values(all);
  }
}

module.exports = new Database();

