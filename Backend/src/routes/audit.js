const express = require("express");
const { prisma } = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.json({ logs });
  })
);

module.exports = router;
