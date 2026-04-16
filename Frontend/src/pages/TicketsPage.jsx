import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar.jsx";
import api from "../lib/api.js";
import { colors, styles, getPriorityTone, getStatusTone } from "../styles.js";

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [assets, setAssets] = useState([]);
  const [filters, setFilters] = useState({ q: "", status: "", priority: "", category: "", overdue: "" });
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    category: "General Support",
    assetId: "",
  });
  const [err, setErr] = useState("");

  async function load(current = filters) {
    try {
      const [ticketRes, assetRes] = await Promise.all([api.listTickets(current), api.getAssets()]);
      setTickets(ticketRes.tickets || []);
      setAssets(assetRes.assets || []);
      setErr("");
    } catch (e) {
      setErr(e.message || "Failed to load tickets");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createTicket(e) {
    e.preventDefault();
    try {
      await api.createTicket(form);
      setForm({
        title: "",
        description: "",
        priority: "MEDIUM",
        category: "General Support",
        assetId: "",
      });
      load();
    } catch (e) {
      setErr(e.message || "Failed to create ticket");
    }
  }

  return (
    <div style={styles.page}>
      <NavBar />
      <div style={styles.container}>
        <div style={styles.hero}>
          <h1 style={{ margin: 0 }}>Tickets</h1>
          <p style={{ marginTop: 10, color: "rgba(255,255,255,0.86)" }}>
            Submit requests, review the queue, and connect support work to tracked devices.
          </p>
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

        <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 16, marginTop: 18 }}>
          <form onSubmit={createTicket} style={styles.card}>
            <div style={{ ...styles.sectionTitle, marginBottom: 8 }}>Submit a support request</div>
            <div style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>
              Log a new issue and optionally connect it to an existing device.
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <input
                style={styles.input}
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />

              <textarea
                style={styles.textarea}
                placeholder="Describe the issue"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              <input
                style={styles.input}
                placeholder="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />

              <select
                style={styles.input}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>

              <select
                style={styles.input}
                value={form.assetId}
                onChange={(e) => setForm({ ...form, assetId: e.target.value })}
              >
                <option value="">No linked asset</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.assetTag} - {asset.name}
                  </option>
                ))}
              </select>

              <button style={styles.button}>Create ticket</button>
            </div>
          </form>

          <div style={styles.card}>
            <div style={{ ...styles.sectionTitle, marginBottom: 12 }}>Ticket list</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 1fr 1fr auto",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <input
                style={styles.input}
                placeholder="Search"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              />

              <select
                style={styles.input}
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All status</option>
                <option>OPEN</option>
                <option>IN_PROGRESS</option>
                <option>WAITING</option>
                <option>RESOLVED</option>
                <option>CLOSED</option>
              </select>

              <select
                style={styles.input}
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              >
                <option value="">All priority</option>
                <option>LOW</option>
                <option>MEDIUM</option>
                <option>HIGH</option>
                <option>URGENT</option>
              </select>

              <input
                style={styles.input}
                placeholder="Category"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              />

              <button type="button" style={styles.secondaryButton} onClick={() => load(filters)}>
                Apply
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                style={styles.ghostButton}
                onClick={() => {
                  const next = { ...filters, overdue: "true" };
                  setFilters(next);
                  load(next);
                }}
              >
                At-risk tickets
              </button>

              <button
                type="button"
                style={styles.ghostButton}
                onClick={() => {
                  const next = { ...filters, status: "OPEN", priority: "HIGH" };
                  setFilters(next);
                  load(next);
                }}
              >
                Open high priority
              </button>

              <button
                type="button"
                style={styles.ghostButton}
                onClick={() => {
                  const next = { q: "", status: "", priority: "", category: "", overdue: "" };
                  setFilters(next);
                  load(next);
                }}
              >
                Clear
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      ...styles.softCard,
                      display: "grid",
                      gridTemplateColumns: "1.4fr auto auto",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{ticket.title}</div>
                      <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                        {ticket.category} •{" "}
                        {ticket.asset ? `${ticket.asset.assetTag} linked` : "No asset linked"} •{" "}
                        {ticket.assignee?.email || "Unassigned"}
                      </div>
                    </div>

                    <span style={{ ...styles.badge, ...getPriorityTone(ticket.priority) }}>
                      {ticket.priority}
                    </span>

                    <span style={{ ...styles.badge, ...getStatusTone(ticket.status) }}>
                      {ticket.status.replaceAll("_", " ")}
                    </span>
                  </div>
                </Link>
              ))}

              {!tickets.length ? (
                <div style={styles.softCard}>No tickets match the current view.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}