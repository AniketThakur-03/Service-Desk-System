-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'TICKET_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'TICKET_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'TICKET_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'TICKET_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'SLA_BREACH_JOB_RUN';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "slaBreached" BOOLEAN NOT NULL DEFAULT false;
