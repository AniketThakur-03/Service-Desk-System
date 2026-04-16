const jwt = require("jsonwebtoken");
const { logSecurityEvent } = require("../utils/security");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    await logSecurityEvent({
      req,
      category: "AUTH",
      severity: "MEDIUM",
      eventType: "AUTH_MISSING",
      message: "Protected route requested without bearer token",
      metadata: { path: req.originalUrl, method: req.method },
    });
    return res.status(401).json({
      error: { code: "AUTH_MISSING", message: "Missing or invalid token" },
    });
  }

  const token = header.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = payload;
    next();
  } catch {
    await logSecurityEvent({
      req,
      category: "AUTH",
      severity: "HIGH",
      eventType: "AUTH_INVALID",
      message: "Invalid or expired access token presented",
      metadata: { path: req.originalUrl, method: req.method },
    });
    return res.status(401).json({
      error: { code: "AUTH_INVALID", message: "Invalid or expired token" },
    });
  }
}

module.exports = { requireAuth };
