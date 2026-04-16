const { prisma } = require("./prisma");

function clientIp(req) {
  const header = req.headers["x-forwarded-for"];
  if (Array.isArray(header)) return header[0];
  if (typeof header === "string" && header.trim()) return header.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
}

async function logSecurityEvent({
  req,
  category,
  severity = "LOW",
  eventType,
  message,
  user = null,
  metadata = null,
}) {
  try {
    return await prisma.securityEvent.create({
      data: {
        category,
        severity,
        eventType,
        message,
        sourceIp: req ? clientIp(req) : null,
        requestId: req?.requestId || null,
        userId: user?.userId || user?.id || null,
        userEmail: user?.email || null,
        metadata,
      },
    });
  } catch (error) {
    console.error("Failed to record security event", error);
    return null;
  }
}

module.exports = { logSecurityEvent, clientIp };
