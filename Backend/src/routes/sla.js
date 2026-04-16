const express = require("express");
const { prisma } = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/active",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const active = await prisma.ticket.findMany({
      where: {
        slaBreached: false,
        resolvedAt: null,
      },
      include: {
        requester: { select: { id: true, email: true } },
        assignee: { select: { id: true, email: true } },
      },
    });

    res.json({ active });
  })
);

router.get(
  "/breached",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const breached = await prisma.ticket.findMany({
      where: {
        slaBreached: true,
        resolvedAt: null,
      },
      include: {
        requester: { select: { id: true, email: true } },
        assignee: { select: { id: true, email: true } },
      },
    });

    res.json({ breached });
  })
);

router.get(
  "/summary",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const activeCount = await prisma.ticket.count({
      where: {
        slaBreached: false,
        resolvedAt: null,
      },
    });

    const breachedCount = await prisma.ticket.count({
      where: {
        slaBreached: true,
        resolvedAt: null,
      },
    });

    const totalTracked = activeCount + breachedCount;
    const breachRate =
      totalTracked === 0 ? 0 : Number(((breachedCount / totalTracked) * 100).toFixed(2));

    res.json({
      summary: {
        activeCount,
        breachedCount,
        breachRate,
      },
    });
  })
);

module.exports = router;
