import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar.jsx";
import api from "../lib/api.js";
import { colors, styles, getPriorityTone, getStatusTone } from "../styles.js";

function QueueColumn({ title, tickets }) {
  return (
    <div style={styles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <span style={styles.badge}>{tickets.length}</span>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {tickets.map((ticket) => (
          <Link key={ticket.id} to={`/tickets/${ticket.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ ...styles.softCard }}>
              <div style={{ fontWeight: 700 }}>{ticket.title}</div>
              <div style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{ticket.assignee?.email || "Unassigned"}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ ...styles.badge, ...getPriorityTone(ticket.priority) }}>{ticket.priority}</span>
                <span style={{ ...styles.badge, ...getStatusTone(ticket.status) }}>{ticket.status.replaceAll("_", " ")}</span>
              </div>
            </div>
          </Link>
        ))}
        {!tickets.length ? <div style={{ color: colors.muted }}>No tickets in this queue.</div> : null}
      </div>
    </div>
  );
}

export default function QueuePage() {
  const [tickets, setTickets] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .listTickets({ page: 1, pageSize: 50 })
      .then((res) => setTickets(res.tickets || []))
      .catch((e) => setErr(e.message || "Failed to load queues"));
  }, []);

  const grouped = {
    OPEN: tickets.filter((t) => t.status === "OPEN"),
    IN_PROGRESS: tickets.filter((t) => t.status === "IN_PROGRESS"),
    WAITING: tickets.filter((t) => t.status === "WAITING"),
    RESOLVED: tickets.filter((t) => t.status === "RESOLVED"),
  };

  return (
    <div style={styles.page}>
      <NavBar />
      <div style={styles.container}>
        <div style={{ ...styles.hero, marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontSize: 32 }}>Queue board</h1>
          <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.86)" }}>A simple queue board grouped by ticket status.</p>
        </div>
        {err ? <div style={{ color: colors.danger, marginBottom: 12 }}>{err}</div> : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
          <QueueColumn title="Open" tickets={grouped.OPEN} />
          <QueueColumn title="In Progress" tickets={grouped.IN_PROGRESS} />
          <QueueColumn title="Waiting" tickets={grouped.WAITING} />
          <QueueColumn title="Resolved" tickets={grouped.RESOLVED} />
        </div>
      </div>
    </div>
  );
}
