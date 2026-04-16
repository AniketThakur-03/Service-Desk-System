const { prisma } = require("./prisma");

async function addTicketHistory({
  ticketId,
  action,
  field = null,
  oldValue = null,
  newValue = null,
  actor = null,
}) {
  const actorId = actor?.userId || actor?.id || null;

  return prisma.ticketHistory.create({
    data: {
      ticketId,
      action,
      field,
      oldValue: oldValue == null ? null : String(oldValue),
      newValue: newValue == null ? null : String(newValue),
      actorId,
      actorEmail: actor?.email || null,
    },
  });
}

module.exports = { addTicketHistory };
