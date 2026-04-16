const express = require("express");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");
const { prisma } = require("../utils/prisma");
const { validateBody } = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  changePasswordSchema,
} = require("../validators/auth");
const { logAudit } = require("../utils/audit");
const { logSecurityEvent } = require("../utils/security");
const {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiryDate,
} = require("../utils/tokens");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const MAX_FAILED_LOGINS = 5;
const ACCOUNT_LOCK_MINUTES = 15;

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    await logSecurityEvent({
      req,
      category: "ABUSE",
      severity: "HIGH",
      eventType: "LOGIN_RATE_LIMIT",
      message: "Login endpoint rate limit triggered",
      metadata: { email: req.body?.email || null },
    });

    return res.status(429).json({
      error: {
        code: "RATE_LIMIT",
        message: "Too many login attempts. Please wait a moment and try again.",
      },
    });
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    await logSecurityEvent({
      req,
      category: "ABUSE",
      severity: "MEDIUM",
      eventType: "REGISTER_RATE_LIMIT",
      message: "Registration endpoint rate limit triggered",
    });

    return res.status(429).json({
      error: {
        code: "RATE_LIMIT",
        message: "Too many registration attempts. Please try again later.",
      },
    });
  },
});

function setRefreshCookie(res, refreshToken) {
  const isProd = process.env.NODE_ENV === "production";
  const days = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || "14", 10);
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: days * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie("refreshToken", { path: "/" });
}

async function issueTokensForUser(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: refreshTokenExpiryDate(),
    },
  });

  setRefreshCookie(res, refreshToken);
  return { accessToken };
}

router.post(
  "/register",
  registerLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({
        error: { code: "EMAIL_TAKEN", message: "Email already registered" },
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    await logAudit({
      action: "USER_REGISTER",
      actor: { userId: user.id, email: user.email, role: user.role },
      targetType: "User",
      targetId: user.id,
      metadata: { email: user.email },
    });

    const { accessToken } = await issueTokensForUser(res, user);

    res.status(201).json({
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  })
);

router.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await logSecurityEvent({
        req,
        category: "AUTH",
        severity: "MEDIUM",
        eventType: "LOGIN_UNKNOWN_USER",
        message: "Login attempted for unknown email address",
        metadata: { email },
      });
      return res.status(401).json({
        error: { code: "BAD_CREDENTIALS", message: "Invalid credentials" },
      });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await Promise.allSettled([
        logAudit({
          action: "ACCOUNT_LOCKED",
          actor: { userId: user.id, email: user.email, role: user.role },
          targetType: "User",
          targetId: user.id,
          metadata: { lockedUntil: user.lockedUntil.toISOString() },
        }),
        logSecurityEvent({
          req,
          user,
          category: "AUTH",
          severity: "HIGH",
          eventType: "LOGIN_LOCKED_ACCOUNT",
          message: "Attempted login against locked account",
          metadata: { lockedUntil: user.lockedUntil.toISOString() },
        }),
      ]);
      return res.status(423).json({
        error: { code: "ACCOUNT_LOCKED", message: "Account temporarily locked. Try again later." },
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      const failedLoginAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedLoginAttempts >= MAX_FAILED_LOGINS;
      const lockedUntil = shouldLock ? new Date(Date.now() + ACCOUNT_LOCK_MINUTES * 60 * 1000) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts,
          lockedUntil,
        },
      });

      await Promise.allSettled([
        logAudit({
          action: shouldLock ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
          actor: { userId: user.id, email: user.email, role: user.role },
          targetType: "User",
          targetId: user.id,
          metadata: { failedLoginAttempts, lockedUntil: lockedUntil?.toISOString() || null },
        }),
        logSecurityEvent({
          req,
          user,
          category: "AUTH",
          severity: shouldLock ? "HIGH" : "MEDIUM",
          eventType: shouldLock ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
          message: shouldLock ? "Account locked after repeated failed logins" : "Failed login attempt recorded",
          metadata: { failedLoginAttempts, lockedUntil: lockedUntil?.toISOString() || null },
        }),
      ]);

      return res.status(401).json({
        error: { code: "BAD_CREDENTIALS", message: "Invalid credentials" },
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    await logAudit({
      action: "USER_LOGIN",
      actor: { userId: user.id, email: user.email, role: user.role },
      targetType: "User",
      targetId: user.id,
      metadata: { email: user.email },
    });

    const { accessToken } = await issueTokensForUser(res, user);

    res.json({
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  })
);

router.post(
  "/refresh",
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => {
    const tokenFromCookie = req.cookies?.refreshToken;
    const tokenFromBody = req.body.refreshToken;
    const refreshToken = tokenFromCookie || tokenFromBody;

    if (!refreshToken) {
      return res.status(401).json({
        error: { code: "REFRESH_MISSING", message: "Missing refresh token" },
      });
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) {
      clearRefreshCookie(res);
      await logSecurityEvent({
        req,
        category: "AUTH",
        severity: "HIGH",
        eventType: "REFRESH_INVALID",
        message: "Refresh attempted with unknown token",
      });
      return res.status(401).json({
        error: { code: "REFRESH_INVALID", message: "Invalid refresh token" },
      });
    }

    const now = new Date();
    const expired = record.expiresAt <= now;
    const revoked = record.revokedAt !== null;

    if (expired || revoked) {
      clearRefreshCookie(res);
      await logSecurityEvent({
        req,
        user: record.user,
        category: "AUTH",
        severity: "HIGH",
        eventType: expired ? "REFRESH_EXPIRED" : "REFRESH_REVOKED",
        message: "Refresh token rejected during token rotation",
        metadata: { expired, revoked },
      });
      return res.status(401).json({
        error: {
          code: expired ? "REFRESH_EXPIRED" : "REFRESH_REVOKED",
          message: "Refresh token is not valid",
        },
      });
    }

    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: now },
    });

    await logAudit({
      action: "TOKEN_REFRESHED",
      actor: { userId: record.user.id, email: record.user.email, role: record.user.role },
      targetType: "User",
      targetId: record.user.id,
      metadata: { refreshTokenId: record.id },
    });

    const { accessToken } = await issueTokensForUser(res, record.user);

    res.json({
      accessToken,
      user: {
        id: record.user.id,
        email: record.user.email,
        role: record.user.role,
      },
    });
  })
);

router.post(
  "/logout",
  validateBody(logoutSchema),
  asyncHandler(async (req, res) => {
    const tokenFromCookie = req.cookies?.refreshToken;
    const tokenFromBody = req.body.refreshToken;
    const refreshToken = tokenFromCookie || tokenFromBody;

    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    clearRefreshCookie(res);
    await logAudit({
      action: "USER_LOGOUT",
      actor: null,
      targetType: "Session",
      metadata: { viaCookie: Boolean(tokenFromCookie) },
    });
    res.json({ ok: true });
  })
);

router.post(
  "/logout-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.refreshToken.updateMany({
      where: { userId: req.user.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    clearRefreshCookie(res);
    await logAudit({
      action: "USER_LOGOUT",
      actor: req.user,
      targetType: "User",
      targetId: req.user.userId,
      metadata: { allSessions: true },
    });
    res.json({ ok: true });
  })
);

router.post(
  "/change-password",
  requireAuth,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User not found" } });

    const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!valid) {
      await logSecurityEvent({
        req,
        user: req.user,
        category: "AUTH",
        severity: "MEDIUM",
        eventType: "PASSWORD_CHANGE_DENIED",
        message: "Password change denied due to incorrect current password",
      });
      return res.status(400).json({ error: { code: "BAD_PASSWORD", message: "Current password is incorrect" } });
    }

    const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordChangedAt: new Date() },
    });

    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    clearRefreshCookie(res);

    await logAudit({
      action: "PASSWORD_CHANGED",
      actor: req.user,
      targetType: "User",
      targetId: user.id,
    });

    res.json({ ok: true, message: "Password updated. Please log in again." });
  })
);

module.exports = router;
