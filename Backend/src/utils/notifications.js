const { prisma } = require('./prisma');

async function createNotification({ userId, title, body, type = 'INFO', link = null }) {
  if (!userId) return null;
  return prisma.notification.create({
    data: { userId, title, body, type, link },
  });
}

module.exports = { createNotification };
