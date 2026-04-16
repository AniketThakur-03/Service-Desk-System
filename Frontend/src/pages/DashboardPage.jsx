import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar.jsx";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { colors, styles, getPriorityTone, getStatusTone } from "../styles.js";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

function StatCard({ label, value, helper }) {
  return (
    <div style={styles.card}>
      <div
        style={{
          fontSize: 12,
          color: colors.muted,
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800 }}>{value ?? 0}</div>
      {helper ? (
        <div style={{ marginTop: 6, color: colors.muted, fontSize: 13 }}>
          {helper}
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [assets, setAssets] = useState([]);
  const [articles, setArticles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const [overview, insightRes, assetRes, articleRes, notificationRes] =
        await Promise.all([
          api.getOverview(),
          api.getInsights(),
          api.getAssets(),
          api.getKnowledge(),
          api.getNotifications(),
        ]);

      setStats(overview || null);
      setInsights(insightRes || null);
      setAssets((assetRes?.assets || []).slice(0, 4));
      setArticles((articleRes?.articles || []).slice(0, 4));
      setNotifications((notificationRes?.notifications || []).slice(0, 5));
      setErr("");
    } catch (e) {
      setErr(e.message || "Failed to load dashboard");
    }
  }

  useEffect(() => {
    load();
  }, [user?.role]);

  const totals = stats?.totals || {};

  const statusChartData = [
    { name: "Open", value: totals.activeTickets || 0 },
    { name: "Resolved", value: totals.resolvedTickets || 0 },
    { name: "At Risk", value: totals.breachedOpenTickets || 0 },
  ];

  const workloadChartData = (insights?.workload || []).slice(0, 5).map((item) => ({
    email: item.email || "Unknown",
    count: item.count || 0,
  }));

  return (
    <div style={styles.page}>
      <NavBar />
      <div style={styles.container}>
        <div style={styles.hero}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.8,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Support workspace
              </div>
              <h1 style={{ margin: "8px 0 10px", fontSize: 34 }}>
                Support Dashboard
              </h1>
              <p
                style={{
                  margin: 0,
                  maxWidth: 760,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.86)",
                }}
              >
                Monitor ticket volume, workload, linked assets, and recent activity from a single support dashboard.
              </p>
            </div>

            <button style={styles.secondaryButton} onClick={load}>
              Refresh
            </button>
          </div>
        </div>

        {err ? (
          <div
            style={{
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: 12,
              background: colors.dangerSoft,
              color: colors.danger,
              fontWeight: 600,
            }}
          >
            {err}
          </div>
        ) : null}

        {!stats ? (
          <div style={{ ...styles.card, marginTop: 18 }}>
            Loading dashboard data...
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 14,
                marginTop: 18,
              }}
            >
              <StatCard label="All tickets" value={totals.totalTickets} />
              <StatCard
                label="In progress"
                value={totals.activeTickets}
                helper="Open, in progress, and waiting"
              />
              <StatCard
                label="Resolved items"
                value={totals.resolvedTickets}
                helper={
                  insights?.averageResolutionHours
                    ? `${insights.averageResolutionHours}h average`
                    : ""
                }
              />
              <StatCard
                label="At-risk tickets"
                value={totals.breachedOpenTickets}
                helper={
                  totals.totalTickets
                    ? `${totals.openBreachRate || 0}% open breach rate`
                    : ""
                }
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginTop: 18,
              }}
            >
              <div style={styles.card}>
                <div style={{ ...styles.sectionTitle, marginBottom: 12 }}>
                  Tickets by Status
                </div>
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={statusChartData} dataKey="value" outerRadius={90}>
                        {statusChartData.map((_, index) => (
                          <Cell key={index} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={styles.card}>
                <div style={{ ...styles.sectionTitle, marginBottom: 12 }}>
                  Team Workload
                </div>
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={workloadChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="email" hide={workloadChartData.length > 4} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 0.8fr",
                gap: 16,
                marginTop: 18,
              }}
            >
              <div style={styles.card}>
                <div style={{ ...styles.sectionTitle, marginBottom: 14 }}>
                  Recent ticket updates
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {(insights?.recentCreated || []).map((ticket) => (
                    <Link
                      key={ticket.id}
                      to={`/tickets/${ticket.id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <div
                        style={{
                          ...styles.softCard,
                          display: "grid",
                          gridTemplateColumns: "1fr auto auto",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>{ticket.title}</div>
                          <div
                            style={{
                              fontSize: 12,
                              color: colors.muted,
                              marginTop: 4,
                            }}
                          >
                            {ticket.category || "General"} •{" "}
                            {ticket.assignee?.email || "Unassigned"}
                          </div>
                        </div>
                        <span
                          style={{
                            ...styles.badge,
                            ...getPriorityTone(ticket.priority),
                          }}
                        >
                          {ticket.priority}
                        </span>
                        <span
                          style={{
                            ...styles.badge,
                            ...getStatusTone(ticket.status),
                          }}
                        >
                          {String(ticket.status || "").replaceAll("_", " ")}
                        </span>
                      </div>
                    </Link>
                  ))}

                  {!(insights?.recentCreated || []).length ? (
                    <div style={styles.softCard}>No recent ticket updates.</div>
                  ) : null}
                </div>
              </div>

              <div style={styles.card}>
                <div style={{ ...styles.sectionTitle, marginBottom: 14 }}>
                  Notifications
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {notifications.map((item) => (
                    <div key={item.id} style={styles.softCard}>
                      <div style={{ fontWeight: 700 }}>{item.title || "Update"}</div>
                      <div
                        style={{
                          fontSize: 13,
                          color: colors.muted,
                          marginTop: 4,
                        }}
                      >
                        {item.body || ""}
                      </div>
                    </div>
                  ))}
                  {!notifications.length ? (
                    <div style={styles.softCard}>No notifications yet.</div>
                  ) : null}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginTop: 18,
              }}
            >
              <div style={styles.card}>
                <div style={{ ...styles.sectionTitle, marginBottom: 14 }}>
                  Tracked assets
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {assets.map((asset) => (
                    <div key={asset.id} style={styles.softCard}>
                      <div style={{ fontWeight: 700 }}>{asset.name}</div>
                      <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                        {asset.assetTag} • {asset.type} •{" "}
                        {String(asset.status || "").replaceAll("_", " ")}
                      </div>
                      <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                        Assigned to {asset.assignedUser?.email || "No one yet"}
                      </div>
                    </div>
                  ))}
                  {!assets.length ? (
                    <div style={styles.softCard}>No tracked assets yet.</div>
                  ) : null}
                </div>
              </div>

              <div style={styles.card}>
                <div style={{ ...styles.sectionTitle, marginBottom: 14 }}>
                  Support articles
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {articles.map((article) => (
                    <div key={article.id} style={styles.softCard}>
                      <div style={{ fontWeight: 700 }}>{article.title}</div>
                      <div style={{ fontSize: 12, color: colors.muted }}>
                        {article.category}
                      </div>
                      <div style={{ fontSize: 13, color: colors.muted, marginTop: 6 }}>
                        {article.summary}
                      </div>
                    </div>
                  ))}
                  {!articles.length ? (
                    <div style={styles.softCard}>No articles available yet.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}