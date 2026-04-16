import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { colors, styles } from "../styles.js";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!email.trim() || !password.trim()) {
      setErr("Please enter both email and password.");
      return;
    }

    setSaving(true);
    try {
      await login(email.trim(), password);
      nav(loc.state?.from || "/", { replace: true });
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setSaving(false);
    }
  }

  const highlights = [
    "Role-based sign-in",
    "Ticket lifecycle tracking",
    "Asset and device linkage",
    "Queue and activity overview",
  ];

  return (
    <div style={{ ...styles.page, display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 1040,
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 24,
        }}
      >
        <div
          style={{
            ...styles.card,
            padding: 32,
            background: "linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)",
          }}
        >
          <div style={styles.badge}>Support platform</div>

          <h1 style={{ fontSize: 36, lineHeight: 1.15, margin: "16px 0 12px" }}>
            Internal IT support, ticketing, and asset tracking in one place.
          </h1>

          <p style={{ color: colors.muted, lineHeight: 1.7, margin: 0, maxWidth: 620 }}>
            A full-stack service desk platform for managing support requests, tracking work in
            progress, linking devices, and documenting common fixes.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginTop: 22 }}>
            {highlights.map((item) => (
              <div key={item} style={{ ...styles.softCard, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{item}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...styles.card, padding: 28 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 28 }}>Sign in</h2>
          <p style={{ color: colors.muted, margin: "0 0 18px", lineHeight: 1.6 }}>
            Use your account to view tickets, updates, and support activity.
          </p>

          {err ? (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: 12,
                background: colors.dangerSoft,
                color: colors.danger,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {err}
            </div>
          ) : null}

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              style={styles.input}
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button type="submit" style={styles.button} disabled={saving}>
              {saving ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p style={{ marginTop: 16, color: colors.muted, fontSize: 14 }}>
            Need an account? <Link to="/register">Create one here</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}