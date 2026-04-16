const express = require('express');
const { prisma } = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const assets = await prisma.asset.findMany({
    include: {
      assignedUser: { select: { id: true, email: true, role: true } },
      tickets: { select: { id: true, title: true, status: true, priority: true } },
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });
  res.json({ assets });
}));

router.post('/', requireAuth, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { name, assetTag, type, serialNumber, location, assignedUserId, status } = req.body || {};
  if (!name || !assetTag || !type) return res.status(400).json({ error: 'name, assetTag, and type are required' });

  const asset = await prisma.asset.create({
    data: { name, assetTag, type, serialNumber: serialNumber || null, location: location || null, assignedUserId: assignedUserId || null, status: status || 'IN_STOCK' },
  });
  res.status(201).json({ asset });
}));

module.exports = router;
