const express = require('express');
const { prisma } = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const articles = await prisma.knowledgeArticle.findMany({
    where: { isPublished: true },
    include: { author: { select: { id: true, email: true, role: true } } },
    orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
  });
  res.json({ articles });
}));

router.post('/', requireAuth, requireRole('ADMIN', 'AGENT'), asyncHandler(async (req, res) => {
  const { title, summary, content, category } = req.body || {};
  if (!title || !summary || !content) return res.status(400).json({ error: 'title, summary, and content are required' });
  const userId = req.user.userId || req.user.id;

  const article = await prisma.knowledgeArticle.create({
    data: {
      title,
      slug: slugify(title),
      summary,
      content,
      category: category || 'General',
      authorId: userId,
    },
  });
  res.status(201).json({ article });
}));

module.exports = router;
