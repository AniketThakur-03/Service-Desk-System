const { logAudit } = require("../utils/audit");
const { logSecurityEvent } = require("../utils/security");

function requireRole(...allowed) {
  return async (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ error: "Unauthorized" });

    if (!allowed.includes(role)) {
      await Promise.allSettled([
        logAudit({
          action: "ROLE_DENIED",
          actor: req.user,
          targetType: "Route",
          targetId: req.originalUrl,
          metadata: { requiredRoles: allowed, actualRole: role, method: req.method },
        }),
        logSecurityEvent({
          req,
          user: req.user,
          category: "AUTHZ",
          severity: "HIGH",
          eventType: "ROLE_DENIED",
          message: `User role ${role} attempted to access restricted route`,
          metadata: { requiredRoles: allowed, path: req.originalUrl, method: req.method },
        }),
      ]);
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
}

module.exports = { requireRole };
