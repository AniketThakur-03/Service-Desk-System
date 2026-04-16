export const colors = {
  bg: "#f4f7fb",
  bgSoft: "#eef3f9",
  panel: "#ffffff",
  panelSoft: "#f8fafc",
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#64748b",
  primary: "#1d4ed8",
  primarySoft: "#dbeafe",
  success: "#15803d",
  successSoft: "#dcfce7",
  warning: "#b45309",
  warningSoft: "#fef3c7",
  danger: "#b91c1c",
  dangerSoft: "#fee2e2",
};

export const shadows = {
  sm: "0 2px 8px rgba(15, 23, 42, 0.04)",
  md: "0 8px 24px rgba(15, 23, 42, 0.06)",
  lg: "0 18px 45px rgba(15, 23, 42, 0.08)",
};

export const styles = {
  page: {
    minHeight: "100vh",
    background: colors.bg,
    color: colors.text,
  },
  container: {
    maxWidth: 1240,
    margin: "0 auto",
    padding: 24,
  },
  hero: {
    padding: 28,
    borderRadius: 20,
    background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
    color: "white",
    boxShadow: shadows.lg,
  },
  card: {
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    borderRadius: 18,
    padding: 18,
    boxShadow: shadows.md,
  },
  softCard: {
    background: colors.panelSoft,
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 800,
    margin: 0,
  },
  pageTitle: {
    margin: 0,
    fontSize: 30,
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    fontSize: 14,
    boxSizing: "border-box",
    background: "#fff",
    outline: "none",
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    fontSize: 14,
    minHeight: 120,
    resize: "vertical",
    boxSizing: "border-box",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
  },
  button: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "none",
    background: colors.primary,
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    background: "white",
    color: colors.text,
    fontWeight: 700,
    cursor: "pointer",
  },
  ghostButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "none",
    background: "#eff6ff",
    color: colors.primary,
    fontWeight: 700,
    cursor: "pointer",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    background: colors.primarySoft,
    color: colors.primary,
  },
  tableRow: {
    display: "grid",
    gap: 10,
    alignItems: "center",
    padding: "12px 0",
    borderBottom: `1px solid ${colors.border}`,
  },
};

export function getStatusTone(status) {
  const map = {
    OPEN: { background: "#eff6ff", color: "#1d4ed8" },
    IN_PROGRESS: { background: "#ecfeff", color: "#0f766e" },
    WAITING: { background: "#fff7ed", color: "#c2410c" },
    RESOLVED: { background: "#ecfdf5", color: "#15803d" },
    CLOSED: { background: "#f1f5f9", color: "#475569" },
  };
  return map[status] || { background: colors.primarySoft, color: colors.primary };
}

export function getPriorityTone(priority) {
  const map = {
    LOW: { background: "#f1f5f9", color: "#475569" },
    MEDIUM: { background: "#eff6ff", color: "#1d4ed8" },
    HIGH: { background: "#fff7ed", color: "#c2410c" },
    URGENT: { background: "#fef2f2", color: "#b91c1c" },
  };
  return map[priority] || { background: colors.primarySoft, color: colors.primary };
}