import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import NavBar from "../components/NavBar.jsx";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { colors, styles, getPriorityTone, getStatusTone } from "../styles.js";

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [commentBody, setCommentBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [err, setErr] = useState("");

  async function reload() {
    try {
      const [t, c, h] = await Promise.all([
        api.getTicket(id),
        api.getComments(id),
        api.getHistory(id),
      ]);

      setTicket(t.ticket);
      setAssigneeEmail(t.ticket.assignee?.email || "");
      setResolutionSummary(t.ticket.resolutionSummary || "");
      setComments(c.comments || []);
      setHistory(h.history || []);
      setErr("");
    } catch (e) {
      setErr(e.message || "Failed to load ticket");
    }
  }

  useEffect(() => {
    reload();
  }, [id]);

  async function addComment(e) {
    e.preventDefault();
    try {
      await api.addComment(id, commentBody, internal);
      setCommentBody("");
      setInternal(false);
      reload();
    } catch (e) {
      setErr(e.message || "Failed to post update");
    }
  }

  async function assignTicket(e) {
    e.preventDefault();
    try {
      await api.assignTicket(id, assigneeEmail);
      reload();
    } catch (e) {
      setErr(e.message || "Failed to assign ticket");
    }
  }

  async function changeStatus(status) {
    try {
      const extra = {};

      if (status === "RESOLVED") {
        extra.resolutionSummary = resolutionSummary;
      }

      if (status === "OPEN" && ["RESOLVED", "CLOSED"].includes(ticket.status)) {
        extra.reopenReason = reopenReason;
      }

      await api.updateStatus(id, status, extra);
      reload();
    } catch (e) {
      setErr(e.message || "Failed to update status");
    }
  }

  if (!ticket) {
    return (
      <div style={styles.page}>
        <NavBar />
        <div style={styles.container}>
          <div style={styles.card}>Loading request details...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <NavBar />
      <div style={styles.container}>
        {err ? (
          <div
            style={{
              marginBottom: 12,
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

        <div style={styles.hero}>
          <h1 style={{ margin: 0 }}>{ticket.title}</h1>
          <p style={{ marginTop: 10, color: "rgba(255,255,255,0.86)" }}>
            {ticket.description}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.95fr 1.05fr",
            gap: 16,
            marginTop: 18,
          }}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div style={styles.card}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <span style={{ ...styles.badge, ...getPriorityTone(ticket.priority) }}>
                  {ticket.priority}
                </span>
                <span style={{ ...styles.badge, ...getStatusTone(ticket.status) }}>
                  {ticket.status.replaceAll("_", " ")}
                </span>
                <span style={styles.badge}>{ticket.category}</span>
              </div>

              <div style={{ display: "grid", gap: 8, color: colors.muted, fontSize: 14 }}>
                <div>Requester: {ticket.requester?.email}</div>
                <div>Assignee: {ticket.assignee?.email || "Unassigned"}</div>
                <div>
                  Linked asset:{" "}
                  {ticket.asset
                    ? `${ticket.asset.assetTag} - ${ticket.asset.name}`
                    : "No asset linked"}
                </div>
                <div>
                  SLA due:{" "}
                  {ticket.slaDueAt
                    ? new Date(ticket.slaDueAt).toLocaleString()
                    : "Not set"}
                </div>
                <div>
                  Resolution summary: {ticket.resolutionSummary || "Not added yet"}
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>Request actions</div>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED", "OPEN"].map(
                    (status) => (
                      <button
                        key={status}
                        style={styles.ghostButton}
                        onClick={() => changeStatus(status)}
                      >
                        {status.replaceAll("_", " ")}
                      </button>
                    )
                  )}
                </div>

                <textarea
                  style={styles.textarea}
                  placeholder="Add a short resolution summary before marking this request as resolved"
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                />

                <textarea
                  style={styles.textarea}
                  placeholder="Add the reason for reopening this request"
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                />

                {(user?.role === "ADMIN" || user?.role === "AGENT") && (
                  <form onSubmit={assignTicket} style={{ display: "flex", gap: 10 }}>
                    <input
                      style={styles.input}
                      placeholder="Assign to team member by email"
                      value={assigneeEmail}
                      onChange={(e) => setAssigneeEmail(e.target.value)}
                    />
                    <button style={styles.button}>Assign</button>
                  </form>
                )}
              </div>
            </div>

            <div style={styles.card}>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>Activity history</div>
              <div style={{ display: "grid", gap: 10 }}>
                {history.map((item) => (
                  <div key={item.id} style={styles.softCard}>
                    <div style={{ fontWeight: 700 }}>
                      {String(item.action).replaceAll("_", " ")}
                    </div>
                    <div style={{ fontSize: 12, color: colors.muted }}>
                      {item.actorEmail || "system"} •{" "}
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 13, color: colors.muted, marginTop: 6 }}>
                      {item.newValue || item.oldValue || "Updated"}
                    </div>
                  </div>
                ))}

                {!history.length ? (
                  <div style={styles.softCard}>
                    No activity has been recorded for this request yet.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <form onSubmit={addComment} style={styles.card}>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>Post an update</div>

              <textarea
                style={styles.textarea}
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Write a public update or leave an internal note"
              />

              {(user?.role === "ADMIN" || user?.role === "AGENT") && (
                <label
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginTop: 10,
                    color: colors.muted,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={internal}
                    onChange={(e) => setInternal(e.target.checked)}
                  />
                  Internal note
                </label>
              )}

              <button style={{ ...styles.button, marginTop: 12 }}>Post update</button>
            </form>

            <div style={styles.card}>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>Discussion</div>
              <div style={{ display: "grid", gap: 10 }}>
                {comments.map((comment) => (
                  <div key={comment.id} style={styles.softCard}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>
                        {comment.author?.email || "Unknown user"}
                      </div>
                      <div style={{ fontSize: 12, color: colors.muted }}>
                        {comment.isInternal ? "Internal note" : "Public update"}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, marginTop: 8, color: colors.muted }}>
                      {comment.body}
                    </div>
                  </div>
                ))}

                {!comments.length ? (
                  <div style={styles.softCard}>
                    No updates have been posted yet.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}