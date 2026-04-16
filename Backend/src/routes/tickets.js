const express = require("express");
const { prisma } = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const { computeSlaDueAt } = require("../utils/sla");
const { logAudit } = require("../utils/audit");
const { addTicketHistory } = require("../utils/history");
const { updateStatusSchema } = require("../validators/ticketStatus");
const { canTransition } = require("../utils/ticketStatus");
const { createNotification } = require("../utils/notifications");
const {
  createTicketSchema,
  updateTicketSchema,
  assignSchema,
  createCommentSchema,
} = require("../validators/tickets");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

async function getTicketOr403(ticketId, user) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, requesterId: true, assigneeId: true },
  });

  if (!ticket) return { error: { status: 404, body: { error: "Ticket not found" } } };

  const userId = user?.userId || user?.id;
  const isAdmin = user.role === "ADMIN";
  const isAgent = user.role === "AGENT";
  const isRequester = ticket.requesterId === userId;
  const isAssignee = ticket.assigneeId && ticket.assigneeId === userId;

  if (isAdmin || isAgent || isRequester || isAssignee) return { ticket };
  return { error: { status: 403, body: { error: "Forbidden" } } };
}

function getBaseScope(user) {
  const userId = user.userId || user.id;
  if (user.role === "ADMIN") return {};
  if (user.role === "AGENT") return { OR: [{ requesterId: userId }, { assigneeId: userId }] };
  return { requesterId: userId };
}

function buildTicketWhere(req) {
  const { status, priority, assigned, assigneeId, requesterId, q, overdue, category, assetLinked } = req.query;
  let where = getBaseScope(req.user);

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (category) where.category = category;
  if (assigned === "true") where.assigneeId = { not: null };
  if (assigned === "false") where.assigneeId = null;
  if (assetLinked === "true") where.assetId = { not: null };
  if (assetLinked === "false") where.assetId = null;
  if (assigneeId && req.user.role === "ADMIN") where.assigneeId = assigneeId;
  if (requesterId && req.user.role === "ADMIN") where.requesterId = requesterId;
  if (overdue === "true") {
    where.slaDueAt = { lt: new Date() };
    where.status = { notIn: ["RESOLVED", "CLOSED"] };
  }

  if (q) {
    const search = {
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { category: { contains: q } },
      ],
    };
    where = Object.keys(where).length ? { AND: [where, search] } : search;
  }

  return where;
}

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { page = "1", pageSize = "10" } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const sizeNum = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 50);
    const where = buildTicketWhere(req);

    const [total, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        orderBy: [{ slaBreached: "desc" }, { createdAt: "desc" }],
        skip: (pageNum - 1) * sizeNum,
        take: sizeNum,
        include: {
          requester: { select: { id: true, email: true, role: true } },
          assignee: { select: { id: true, email: true, role: true } },
          asset: { select: { id: true, name: true, assetTag: true, type: true, status: true } },
        },
      }),
    ]);

    res.json({ page: pageNum, pageSize: sizeNum, total, totalPages: Math.ceil(total / sizeNum), tickets });
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = createTicketSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const { title, description, priority, category, assetId } = parsed.data;
    const userId = req.user.userId || req.user.id;

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        priority: priority || "MEDIUM",
        category: category || "General Support",
        requesterId: userId,
        assetId: assetId || null,
        slaDueAt: computeSlaDueAt(priority || "MEDIUM"),
      },
      include: {
        requester: { select: { id: true, email: true, role: true } },
        assignee: { select: { id: true, email: true, role: true } },
        asset: { select: { id: true, name: true, assetTag: true, type: true, status: true } },
      },
    });

    await addTicketHistory({
      ticketId: ticket.id,
      action: "CREATED",
      field: "ticket",
      newValue: `Created (${ticket.priority}, ${ticket.category})`,
      actor: req.user,
    });

    if (ticket.assetId) {
      await addTicketHistory({
        ticketId: ticket.id,
        action: "LINKED_ASSET",
        field: "asset",
        newValue: ticket.asset?.assetTag || ticket.assetId,
        actor: req.user,
      });
    }

    await logAudit({
      action: "TICKET_CREATED",
      actor: req.user,
      targetType: "Ticket",
      targetId: ticket.id,
      metadata: { title: ticket.title, priority: ticket.priority, category: ticket.category },
    });

    res.status(201).json({ ticket });
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const access = await getTicketOr403(req.params.id, req.user);
    if (access.error) return res.status(access.error.status).json(access.error.body);

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        requester: { select: { id: true, email: true, role: true } },
        assignee: { select: { id: true, email: true, role: true } },
        asset: { select: { id: true, name: true, assetTag: true, type: true, status: true, location: true } },
      },
    });

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json({ ticket });
  })
);

router.patch(
  "/:id/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const { status, resolutionSummary, reopenReason } = parsed.data;
    const existing = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Ticket not found" });

    const access = await getTicketOr403(existing.id, req.user);
    if (access.error) return res.status(access.error.status).json(access.error.body);

    if (!canTransition(existing.status, status)) {
      return res.status(400).json({ error: `Invalid status transition from ${existing.status} to ${status}` });
    }
    if (status === "RESOLVED" && !resolutionSummary) {
      return res.status(400).json({ error: "Resolution summary is required before resolving a ticket" });
    }
    if (status === "OPEN" && ["RESOLVED", "CLOSED"].includes(existing.status) && !reopenReason) {
      return res.status(400).json({ error: "Provide a reopen reason so the ticket history stays clear" });
    }

    const ticket = await prisma.ticket.update({
      where: { id: existing.id },
      data: {
        status,
        resolvedAt: status === "RESOLVED" ? new Date() : status === "CLOSED" ? existing.resolvedAt || new Date() : null,
        resolutionSummary: status === "RESOLVED" ? resolutionSummary : status === "OPEN" ? existing.resolutionSummary : existing.resolutionSummary,
      },
      include: { requester: true, assignee: true },
    });

    await addTicketHistory({ ticketId: ticket.id, action: "STATUS_CHANGED", field: "status", oldValue: existing.status, newValue: status, actor: req.user });
    if (status === "RESOLVED") {
      await addTicketHistory({ ticketId: ticket.id, action: "RESOLUTION_ADDED", field: "resolutionSummary", newValue: resolutionSummary, actor: req.user });
    }
    if (status === "OPEN" && ["RESOLVED", "CLOSED"].includes(existing.status)) {
      await addTicketHistory({ ticketId: ticket.id, action: "REOPENED", field: "reopenReason", oldValue: existing.status, newValue: reopenReason, actor: req.user });
    }

    await logAudit({ action: "TICKET_STATUS_CHANGED", actor: req.user, targetType: "Ticket", targetId: ticket.id, metadata: { from: existing.status, to: status } });

    const notifyUserIds = [ticket.requesterId, ticket.assigneeId].filter(Boolean);
    await Promise.allSettled(notifyUserIds.map((userId) => createNotification({
      userId,
      title: `Ticket moved to ${status.replaceAll("_", " ")}`,
      body: ticket.title,
      type: "STATUS",
      link: `/tickets/${ticket.id}`,
    })));

    return res.json({ ticket });
  })
);

router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = updateTicketSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const existing = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Ticket not found" });

    const userId = req.user.userId || req.user.id;
    const isOwner = existing.requesterId === userId;

    if (req.user.role === "EMPLOYEE") {
      if (!isOwner) return res.status(403).json({ error: "Not allowed" });
      if (existing.status !== "OPEN") return res.status(400).json({ error: "Employees can only edit tickets while OPEN" });
    }

    const data = { ...parsed.data, assetId: parsed.data.assetId === undefined ? existing.assetId : parsed.data.assetId || null };
    if (data.priority && data.priority !== existing.priority) {
      data.slaDueAt = computeSlaDueAt(data.priority);
      data.slaBreached = false;
    }

    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data,
      include: {
        requester: { select: { id: true, email: true, role: true } },
        assignee: { select: { id: true, email: true, role: true } },
        asset: { select: { id: true, name: true, assetTag: true, type: true, status: true } },
      },
    });

    await addTicketHistory({ ticketId: ticket.id, action: "UPDATED", field: "fields", newValue: Object.keys(parsed.data).join(","), actor: req.user });
    if (Object.prototype.hasOwnProperty.call(parsed.data, "assetId")) {
      await addTicketHistory({ ticketId: ticket.id, action: "LINKED_ASSET", field: "asset", oldValue: existing.assetId || null, newValue: data.assetId || null, actor: req.user });
    }

    await logAudit({ action: "TICKET_UPDATED", actor: req.user, targetType: "Ticket", targetId: ticket.id, metadata: { updatedFields: Object.keys(parsed.data) } });
    res.json({ ticket });
  })
);

router.patch(
  "/:id/assign",
  requireAuth,
  requireRole("ADMIN", "AGENT"),
  asyncHandler(async (req, res) => {
    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const { email } = parsed.data.assignee;
    const assignee = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, role: true } });
    if (!assignee) return res.status(404).json({ error: `User not found: ${email}` });

    const existing = await prisma.ticket.findUnique({ where: { id: req.params.id }, include: { assignee: { select: { email: true } } } });
    if (!existing) return res.status(404).json({ error: "Ticket not found" });

    const ticket = await prisma.ticket.update({ where: { id: req.params.id }, data: { assigneeId: assignee.id } });

    await addTicketHistory({ ticketId: ticket.id, action: "ASSIGNED", field: "assignee", oldValue: existing.assignee?.email || null, newValue: assignee.email, actor: req.user });
    await logAudit({ action: "TICKET_ASSIGNED", actor: req.user, targetType: "Ticket", targetId: ticket.id, metadata: { assigneeEmail: assignee.email, assigneeId: assignee.id } });
    await createNotification({ userId: assignee.id, title: "New ticket assigned", body: existing.title, type: "ASSIGNMENT", link: `/tickets/${ticket.id}` });

    return res.json({ ticket });
  })
);

router.post(
  "/:id/comments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const access = await getTicketOr403(req.params.id, req.user);
    if (access.error) return res.status(access.error.status).json(access.error.body);

    const internal = Boolean(parsed.data.isInternal);
    if (internal && !["ADMIN", "AGENT"].includes(req.user.role)) {
      await logAudit({ action: "INTERNAL_NOTE_BLOCKED", actor: req.user, targetType: "Ticket", targetId: req.params.id, metadata: { attemptedInternal: true } });
      return res.status(403).json({ error: "Only Admin/Agent can add internal notes" });
    }

    const userId = req.user.userId || req.user.id;
    const comment = await prisma.ticketComment.create({
      data: { ticketId: req.params.id, authorId: userId, body: parsed.data.body, isInternal: internal },
      include: { author: { select: { id: true, email: true, role: true } } },
    });

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    await addTicketHistory({ ticketId: req.params.id, action: "COMMENT_ADDED", field: internal ? "internalNote" : "comment", newValue: `Comment added (internal=${internal})`, actor: req.user });
    await logAudit({ action: "TICKET_UPDATED", actor: req.user, targetType: "Ticket", targetId: req.params.id, metadata: { commentId: comment.id, isInternal: internal } });

    const recipients = [ticket?.requesterId, ticket?.assigneeId].filter((id) => id && id !== userId);
    await Promise.allSettled(recipients.map((recipientId) => createNotification({
      userId: recipientId,
      title: internal ? "Internal note added" : "New ticket comment",
      body: ticket?.title || "Ticket updated",
      type: internal ? "INTERNAL_NOTE" : "COMMENT",
      link: `/tickets/${req.params.id}`,
    })));

    return res.status(201).json({ comment });
  })
);

router.get(
  "/:id/comments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const access = await getTicketOr403(req.params.id, req.user);
    if (access.error) return res.status(access.error.status).json(access.error.body);

    const where = { ticketId: req.params.id };
    if (req.user.role === "EMPLOYEE") where.isInternal = false;

    const comments = await prisma.ticketComment.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, email: true, role: true } } },
    });

    res.json({ comments });
  })
);

router.get(
  "/:id/history",
  requireAuth,
  asyncHandler(async (req, res) => {
    const access = await getTicketOr403(req.params.id, req.user);
    if (access.error) return res.status(access.error.status).json(access.error.body);

    const history = await prisma.ticketHistory.findMany({ where: { ticketId: req.params.id }, orderBy: { createdAt: "asc" } });
    res.json({ history });
  })
);

module.exports = router;
