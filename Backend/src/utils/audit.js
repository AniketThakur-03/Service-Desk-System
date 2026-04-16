const { prisma } = require("./prisma");

async function logAudit({
  action,
  actor,
  targetType = null,
  targetId = null,
  metadata = null,
}) {
  return prisma.auditLog.create({
    data: {
      action,
      actorId: actor?.userId || null,
      actorEmail: actor?.email || null,
      targetType,
      targetId,
      metadata,
    },
  });
}

module.exports = { logAudit };
