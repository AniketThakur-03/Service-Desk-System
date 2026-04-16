const { prisma } = require("./prisma");
const { logAudit } = require("./audit");

async function markSlaBreaches() {
  const now = new Date();

  const candidates = await prisma.ticket.findMany({
    where: {
      slaBreached: false,
      resolvedAt: null,
      slaDueAt: { lt: now },
    },
    select: { id: true },
    take: 500,
  });

  if (candidates.length === 0) {
    console.log("SLA Job: Marked 0 breached tickets");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const t of candidates) {
      await tx.ticket.update({
        where: { id: t.id },
        data: { slaBreached: true },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId: t.id,
          action: "SLA_BREACHED",
          field: "sla",
          newValue: "SLA breached",
          actorId: null,
          actorEmail: "system",
        },
      });
    }
  });

  await logAudit({
    action: "SLA_BREACH_JOB_RUN",
    actor: null,
    targetType: "System",
    targetId: null,
    metadata: { breachedCount: candidates.length },
  });

  console.log(`SLA Job: Marked ${candidates.length} breached tickets`);
}

module.exports = { markSlaBreaches };
