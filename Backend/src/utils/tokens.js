const jwt = require("jsonwebtoken");
const crypto = require("crypto");

function env(name, fallback) {
  const v = process.env[name];
  if (!v && fallback === undefined) throw new Error(`Missing env var: ${name}`);
  return v || fallback;
}

function signAccessToken(user) {
  const secret = env("JWT_ACCESS_SECRET");
  const ttl = env("ACCESS_TOKEN_TTL", "15m");

  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: ttl }
  );
}

// Opaque refresh token (NOT JWT) — best practice for rotation/revocation.
function generateRefreshToken() {
  return crypto.randomBytes(64).toString("base64url");
}

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function refreshTokenExpiryDate() {
  const days = parseInt(env("REFRESH_TOKEN_TTL_DAYS", "14"), 10);
  const ms = days * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}

module.exports = {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiryDate,
};