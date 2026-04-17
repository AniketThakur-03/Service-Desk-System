import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { colors, styles } from "../styles.js";

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!form.email.trim() || !form.password.trim()) {
      setErr("Email and password are required.");
      return;
    }

    if (form.password.length < 10) {
      setErr("Password must be at least 10 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErr("Passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await register(form.email.trim(), form.password);
      nav("/");
    } catch (e) {
      setErr(e.message || "Registration failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        ...styles.page,
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ ...styles.card, width: "100%", maxWidth: 520, padding: 28 }}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Create account</h2>

        <p style={{ color: colors.muted, lineHeight: 1.6, marginTop: 0 }}>
          Create an account to submit requests, follow updates, and access the support workspace.
          New accounts are created with employee access by default.
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

        <form
          onSubmit={onSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input
            style={styles.input}
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                email: e.target.value,
              }))
            }
          />

          <input
            style={styles.input}
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                password: e.target.value,
              }))
            }
          />

          <input
            style={styles.input}
            placeholder="Confirm password"
            type="password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                confirmPassword: e.target.value,
              }))
            }
          />

          <div style={{ fontSize: 13, color: colors.muted, lineHeight: 1.5 }}>
            Use at least 10 characters and include uppercase, lowercase, a number, and a special character.
          </div>

          <button type="submit" style={styles.button} disabled={saving}>
            {saving ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 14, color: colors.muted }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}