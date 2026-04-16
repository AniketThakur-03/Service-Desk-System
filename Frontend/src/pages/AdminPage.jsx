import React, { useEffect, useMemo, useState } from "react";
import NavBar from "../components/NavBar.jsx";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { colors, styles } from "../styles.js";

function RoleBadge({ role }) {
  const tone = useMemo(() => {
    if (role === "ADMIN") return { background: "#dbeafe", color: colors.primary };
    if (role === "AGENT") return { background: "#dcfce7", color: colors.success };
    return { background: "#ede9fe", color: "#6d28d9" };
  }, [role]);

  return <span style={{ ...styles.badge, ...tone }}>{role}</span>;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [insights, setInsights] = useState(null);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const [userRes, logRes, insightRes] = await Promise.all([
        api.getUsers(),
        api.getAudit(40),
        api.getInsights(),
      ]);
      setUsers(userRes.users || []);
      setLogs(logRes.logs || []);
      setInsights(insightRes);
    } catch (e) {
      setErr(e.message || "Failed to load admin data");
    }
  }

  useEffect(() => {
    if (user?.role === "ADMIN") load();
  }, [user?.role]);

  if (user?.role !== "ADMIN") {
    return (
      <div style={styles.page}>
        <NavBar />
        <div style={styles.container}><div style={styles.card}>Admin only.</div></div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <NavBar />
      <div style={styles.container}>
        <div style={{ ...styles.hero, marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontSize: 32 }}>Admin panel</h1>
          <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.86)" }}>
            Review users, monitor ticket activity, and keep track of team progress from one place.
          </p>
        </div>
        {err ? <div style={{ color: colors.danger, marginBottom: 12 }}>{err}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 16 }}>
          <div style={styles.card}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>Users</div>
            <div style={{ display: "grid", gap: 10 }}>
              {users.map((entry) => (
                <div key={entry.id} style={styles.softCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{entry.email}</div>
                      <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                        Added {new Date(entry.createdAt).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                        Last login: {entry.lastLoginAt ? new Date(entry.lastLoginAt).toLocaleString() : "Never"}
                        {entry.lockedUntil ? ` • Locked until ${new Date(entry.lockedUntil).toLocaleString()}` : ""}
                      </div>
                    </div>
                    <RoleBadge role={entry.role} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>Recent activity</div>
            <div style={{ display: "grid", gap: 10 }}>
              {logs.map((log) => (
                <div key={log.id} style={styles.softCard}>
                  <div style={{ fontWeight: 700 }}>{String(log.action).replaceAll("_", " ")}</div>
                  <div style={{ fontSize: 12, color: colors.muted }}>{log.actorEmail || "system"} • {new Date(log.createdAt).toLocaleString()}</div>
                  <div style={{ fontSize: 13, marginTop: 6, color: colors.muted }}>{log.targetType || "General"} {log.targetId || ""}</div>
                </div>
              ))}
              {!logs.length ? <div style={{ color: colors.muted }}>No recent activity yet.</div> : null}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
          <div style={styles.card}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>System overview</div>
            <div style={{ display: "grid", gap: 12, color: colors.muted, lineHeight: 1.7 }}>
              <div>
                This workspace is built to handle day-to-day support requests, track ticket progress, and keep team activity organized.
              </div>
              <div>
                Staff can create requests, update progress, leave comments, and review ticket history when work moves from one stage to another.
              </div>
              <div>
                The admin view brings together user information, recent actions, team output, and open workload so the queue is easier to manage.
              </div>
            </div>
          </div>
          <div style={styles.card}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>Team performance</div>
            <div style={{ marginBottom: 12, color: colors.muted, fontSize: 13 }}>
              Closed ticket counts are shown below to give a quick picture of current team output.
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {(insights?.leaderboard || []).map((row) => (
                <div key={row.assigneeId} style={styles.softCard}>
                  <div style={{ fontWeight: 700 }}>{row.assignee?.email || "Unassigned"}</div>
                  <div style={{ fontSize: 12, color: colors.muted }}>Resolved tickets: {row.resolved}</div>
                </div>
              ))}
              {!(insights?.leaderboard || []).length ? <div style={{ color: colors.muted }}>No team data yet.</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
