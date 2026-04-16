const { z } = require("zod");

const updateStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]),
  resolutionSummary: z.string().trim().min(5).max(2000).optional(),
  reopenReason: z.string().trim().min(5).max(1000).optional(),
});

module.exports = { updateStatusSchema };
