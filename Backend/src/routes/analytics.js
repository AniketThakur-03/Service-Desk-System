const express = require("express");
const { prisma } = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

function getBaseWhere(user) {
  const role = user.role;
  const userId = user.userId;

  return role === "ADMIN"
    ? {}
    : role === "AGENT"
    ? { OR: [{ assigneeId: userId }, { requesterId: userId }] }
    : { requesterId: userId };
}

router.get(
  "/overview",
  requireAuth,
  asyncHandler(async (req, res) => {
    const now = new Date();
    const baseWhere = getBaseWhere(req.user);

    const [totalTickets, openTickets, inProgressTickets, waitingTickets, resolvedTickets, breachedOpenTickets] =
      await Promise.all([
        prisma.ticket.count({ where: baseWhere }),
        prisma.ticket.count({ where: { ...baseWhere, status: "OPEN" } }),
        prisma.ticket.count({ where: { ...baseWhere, status: "IN_PROGRESS" } }),
        prisma.ticket.count({ where: { ...baseWhere, status: "WAITING" } }),
        prisma.ticket.count({ where: { ...baseWhere, status: "RESOLVED" } }),
        prisma.ticket.count({
          where: {
            ...baseWhere,
            slaDueAt: { lt: now },
            status: { notIn: ["RESOLVED", "CLOSED"] },
          },
        }),
      ]);

    const activeTickets = openTickets + inProgressTickets + waitingTickets;
    const breachRate = activeTickets === 0 ? 0 : +(breachedOpenTickets / activeTickets).toFixed(3);

    res.json({
      totals: {
        totalTickets,
        activeTickets,
        resolvedTickets,
        breachedOpenTickets,
        breachRate,
      },
      byStatus: {
        OPEN: openTickets,
        IN_PROGRESS: inProgressTickets,
        WAITING: waitingTickets,
        RESOLVED: resolvedTickets,
      },
    });
  })
);

router.get(
  "/workload",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.ticket.groupBy({
      by: ["assigneeId", "status"],
      _count: { _all: true },
      where: {
        status: { notIn: ["RESOLVED", "CLOSED"] },
      },
    });

    const map = {};
    for (const r of rows) {
      const key = r.assigneeId || "UNASSIGNED";
      map[key] = map[key] || { OPEN: 0, IN_PROGRESS: 0, WAITING: 0, total: 0 };
      map[key][r.status] = r._count._all;
      map[key].total += r._count._all;
    }

    const assigneeIds = Object.keys(map).filter((k) => k !== "UNASSIGNED");
    const users = await prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, email: true, role: true },
    });

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const workload = Object.entries(map).map(([assigneeId, stats]) => ({
      assigneeId,
      assignee: assigneeId === "UNASSIGNED" ? null : userMap[assigneeId] || null,
      ...stats,
    }));

    workload.sort((a, b) => b.total - a.total);

    res.json({ workload });
  })
);

router.get(
  "/insights",
  requireAuth,
  asyncHandler(async (req, res) => {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const baseWhere = getBaseWhere(req.user);

    const [dueSoon, recentCreated, allRelevantTickets, recentActivity, users] = await Promise.all([
      prisma.ticket.findMany({
        where: {
          ...baseWhere,
          status: { notIn: ["RESOLVED", "CLOSED"] },
          slaDueAt: { gte: now, lte: in48h },
        },
        orderBy: { slaDueAt: "asc" },
        take: 6,
        include: {
          requester: { select: { email: true } },
          assignee: { select: { email: true } },
        },
      }),
      prisma.ticket.findMany({
        where: { ...baseWhere, createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          requester: { select: { email: true } },
          assignee: { select: { email: true } },
        },
      }),
      prisma.ticket.findMany({
        where: baseWhere,
        select: {
          id: true,
          status: true,
          priority: true,
          assigneeId: true,
          createdAt: true,
          resolvedAt: true,
        },
      }),
      prisma.ticketHistory.findMany({
        where: req.user.role === "ADMIN" ? {} : { actorId: req.user.userId },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      req.user.role === "ADMIN"
        ? prisma.user.findMany({
            select: { id: true, email: true, role: true, createdAt: true, lastLoginAt: true, lockedUntil: true },
            orderBy: { createdAt: "desc" },
            take: 12,
          })
        : Promise.resolve([]),
    ]);

    const priorityMix = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    const assigneeMap = new Map();
    let resolvedCount = 0;
    let resolutionHoursTotal = 0;

    for (const ticket of allRelevantTickets) {
      priorityMix[ticket.priority] = (priorityMix[ticket.priority] || 0) + 1;
      const key = ticket.assigneeId || "UNASSIGNED";
      assigneeMap.set(key, (assigneeMap.get(key) || 0) + (ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? 1 : 0));
      if (ticket.resolvedAt) {
        resolvedCount += 1;
        resolutionHoursTotal += (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
      }
    }

    const avgResolutionHours = resolvedCount ? +(resolutionHoursTotal / resolvedCount).toFixed(1) : null;

    let leaderboard = [];
    if (req.user.role === "ADMIN") {
      const ids = [...assigneeMap.keys()].filter((id) => id !== "UNASSIGNED");
      const assignees = ids.length
        ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, role: true } })
        : [];
      const map = Object.fromEntries(assignees.map((u) => [u.id, u]));
      leaderboard = [...assigneeMap.entries()]
        .map(([assigneeId, resolved]) => ({
          assigneeId,
          resolved,
          assignee: assigneeId === "UNASSIGNED" ? null : map[assigneeId] || null,
        }))
        .sort((a, b) => b.resolved - a.resolved)
        .slice(0, 5);
    }

    res.json({
      dueSoon,
      recentCreated,
      recentActivity,
      priorityMix,
      avgResolutionHours,
      leaderboard,
      users,
    });
  })
);

router.get(
  "/security",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [recentEvents, allWeekEvents, lockedUsers, recentFailedLogins] = await Promise.all([
      prisma.securityEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.securityEvent.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { category: true, severity: true, eventType: true, createdAt: true },
      }),
      prisma.user.count({ where: { lockedUntil: { gt: new Date() } } }),
      prisma.auditLog.count({
        where: { action: "LOGIN_FAILED", createdAt: { gte: twentyFourHoursAgo } },
      }),
    ]);

    const severity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const category = {};
    const eventType = {};

    for (const event of allWeekEvents) {
      severity[event.severity] = (severity[event.severity] || 0) + 1;
      category[event.category] = (category[event.category] || 0) + 1;
      eventType[event.eventType] = (eventType[event.eventType] || 0) + 1;
    }

    res.json({
      counts: {
        eventsLast7Days: allWeekEvents.length,
        failedLoginsLast24Hours: recentFailedLogins,
        lockedUsers,
      },
      severity,
      category,
      topEventTypes: Object.entries(eventType)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
      recentEvents,
    });
  })
);

module.exports = router;
