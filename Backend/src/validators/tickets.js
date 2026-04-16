const { z } = require("zod");

const categoryField = z.string().trim().min(2).max(60);

const createTicketSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(5).max(5000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  category: categoryField.optional(),
  assetId: z.string().optional().nullable(),
});

const updateTicketSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().min(5).max(5000).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    category: categoryField.optional(),
    assetId: z.string().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

const assignSchema = z.object({
  assignee: z.object({
    email: z.string().email(),
  }),
});

const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  isInternal: z.boolean().optional(),
});

module.exports = {
  createTicketSchema,
  updateTicketSchema,
  assignSchema,
  createCommentSchema,
};
