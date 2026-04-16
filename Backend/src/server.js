require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const meRoutes = require("./routes/me");
const adminRoutes = require("./routes/admin");
const auditRoutes = require("./routes/audit");
const ticketRoutes = require("./routes/tickets");
const slaRoutes = require("./routes/sla");
const analyticsRoutes = require("./routes/analytics");
const assetRoutes = require("./routes/assets");
const knowledgeRoutes = require("./routes/knowledge");
const notificationRoutes = require("./routes/notifications");
const { markSlaBreaches } = require("./utils/slaBreachJob");
const { logSecurityEvent } = require("./utils/security");
const { notFound } = require("./middleware/notFound");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "no-referrer" },
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(async (req, _res, next) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const userAgent = req.headers["user-agent"];
  if (typeof forwardedFor === "string" && forwardedFor.split(",").length > 3) {
    await logSecurityEvent({
      req,
      category: "NETWORK",
      severity: "MEDIUM",
      eventType: "FORWARDED_CHAIN_SUSPICIOUS",
      message: "Request arrived with unusually long forwarded-for chain",
      metadata: { forwardedFor },
    });
  }
  if (!userAgent) {
    await logSecurityEvent({
      req,
      category: "ABUSE",
      severity: "LOW",
      eventType: "MISSING_USER_AGENT",
      message: "Request missing user-agent header",
    });
  }
  next();
});

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    handler: async (req, res) => {
      await logSecurityEvent({
        req,
        category: "ABUSE",
        severity: "HIGH",
        eventType: "GLOBAL_RATE_LIMIT",
        message: "Global API rate limit triggered",
        metadata: { path: req.originalUrl, method: req.method },
      });
      return res.status(429).json({ error: { code: "RATE_LIMIT", message: "Too many requests" } });
    },
  })
);

app.get("/", (_req, res) => {
  res.json({
    name: "Service Desk API",
    status: "ok",
    docs: {
      health: "/health",
      auth: "/auth",
      tickets: "/tickets",
      analytics: "/analytics/overview",
      insights: "/analytics/insights",
      security: "/analytics/security",
    },
  });
});

app.get("/health", (_req, res) =>
  res.json({
    status: "ok",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  })
);

app.use("/auth", authRoutes);
app.use("/me", meRoutes);
app.use("/admin", adminRoutes);
app.use("/audit", auditRoutes);
app.use("/tickets", ticketRoutes);
app.use("/sla", slaRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/assets", assetRoutes);
app.use("/knowledge", knowledgeRoutes);
app.use("/notifications", notificationRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 4000);

const server = app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});

const interval = setInterval(() => {
  markSlaBreaches().catch((err) => console.error("SLA breach job failed:", err));
}, 60000);

async function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  clearInterval(interval);
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

module.exports = app;
