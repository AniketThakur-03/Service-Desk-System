const express = require("express");
const { prisma } = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const { logAudit } = require("../utils/audit");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/users",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        lockedUntil: true,
        failedLoginAttempts: true,
      },
      orderBy: { createdAt: "desc" },
    });

    await logAudit({
      action: "ADMIN_LIST_USERS",
      actor: req.user,
      metadata: { count: users.length },
    });

    res.json({ users });
  })
);

router.patch(
  "/users/:id/role",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await logAudit({
      action: "ROLE_DENIED",
      actor: req.user,
      targetType: "User",
      targetId: req.params.id,
      metadata: { reason: "Role changes are disabled from the dashboard." },
    });

    res.status(403).json({
      error: "Role changes are disabled from the dashboard. Update seed data or the database directly if you need a different demo setup.",
    });
  })
);

module.exports = router;
