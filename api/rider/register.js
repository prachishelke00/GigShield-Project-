const riderService = require("../../backend/services/riderService");

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

module.exports = async function registerRider(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { success: false, error: "Method not allowed. Use POST." });
  }

  const contentType = req.headers["content-type"] || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return sendJson(res, 415, { success: false, error: "Content-Type must be application/json." });
  }

  try {
    let profile = req.body;
    if (typeof profile === "string") {
      profile = JSON.parse(profile);
    }

    const rider = await riderService.registerRiderProfile(profile);
    return sendJson(res, 200, { success: true, rider });
  } catch (error) {
    const statusCode = error.statusCode || (error instanceof SyntaxError ? 400 : 500);
    return sendJson(res, statusCode, {
      success: false,
      error: error.message || "Rider registration failed."
    });
  }
};
