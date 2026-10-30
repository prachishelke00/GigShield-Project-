/**
 * Persistent JSON File Database for GigShield Rider Profiles
 * Provides atomic, synchronized storage linking blockchain wallet addresses with full off-chain profile data.
 */

const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "..", "data", "riders.json");
const REDIS_HASH = "gigshield:riders";

class Database {
  constructor() {
    this.redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    this.redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    this.redisConfigured = Boolean(this.redisUrl && this.redisToken);

    if (!this.redisConfigured && !process.env.VERCEL) {
      this._init();
    }
  }

  async _redisCommand(command) {
    const response = await fetch(this.redisUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.redisToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(command)
    });
    const payload = await response.json();

    if (!response.ok || payload.error) {
      throw new Error(payload.error || "Hosted rider storage request failed");
    }

    return payload.result;
  }

  _assertStorageConfigured() {
    if (process.env.VERCEL && !this.redisConfigured) {
      throw new Error("Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable persistent rider profiles.");
    }
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
  async getRider(walletAddress) {
    if (!walletAddress) return null;
    const key = walletAddress.toLowerCase();

    if (this.redisConfigured) {
      const rider = await this._redisCommand(["HGET", REDIS_HASH, key]);
      return rider ? JSON.parse(rider) : null;
    }

    this._assertStorageConfigured();
    const all = this._readAll();
    return all[key] || null;
  }

  // Save or update rider record
  async saveRider(rider) {
    if (!rider || !rider.walletAddress) {
      throw new Error("walletAddress is required to save rider");
    }
    const key = rider.walletAddress.toLowerCase();

    let existing;
    if (this.redisConfigured) {
      const savedRider = await this._redisCommand(["HGET", REDIS_HASH, key]);
      existing = savedRider ? JSON.parse(savedRider) : {};
    } else {
      this._assertStorageConfigured();
      existing = this._readAll()[key] || {};
    }

    const updated = {
      ...existing,
      ...rider,
      walletAddress: rider.walletAddress, // keep original casing or checksum
      updatedAt: Date.now()
    };

    if (!updated.registeredAt) {
      updated.registeredAt = Date.now();
    }

    if (this.redisConfigured) {
      await this._redisCommand(["HSET", REDIS_HASH, key, JSON.stringify(updated)]);
    } else {
      const all = this._readAll();
      all[key] = updated;
      this._writeAll(all);
    }

    return updated;
  }

  // List all registered riders
  async getAllRiders() {
    if (this.redisConfigured) {
      const result = await this._redisCommand(["HGETALL", REDIS_HASH]);
      if (Array.isArray(result)) {
        return result.filter((_, index) => index % 2 === 1).map((rider) => JSON.parse(rider));
      }
      return Object.values(result || {}).map((rider) => typeof rider === "string" ? JSON.parse(rider) : rider);
    }

    this._assertStorageConfigured();
    const all = this._readAll();
    return Object.values(all);
  }
}

module.exports = new Database();

