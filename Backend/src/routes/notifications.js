const express = require('express');
const { prisma } = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const unreadCount = notifications.filter((item) => !item.readAt).length;
  res.json({ notifications, unreadCount });
}));

router.post('/read-all', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user.id;
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
}));

module.exports = router;
