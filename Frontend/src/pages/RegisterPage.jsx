
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { colors, styles } from "../styles.js";

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
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
    <div style={{ ...styles.page, display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ ...styles.card, width: "100%", maxWidth: 520, padding: 28 }}>
        <h2 style={{ marginTop: 0 }}>Create account</h2>
        <p style={{ color: colors.muted }}>New accounts start as employee users. Passwords should include uppercase, lowercase, number, and special character.</p>
        {err ? <div style={{ color: colors.danger, marginBottom: 12 }}>{err}</div> : null}
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input style={styles.input} placeholder="Email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          <input style={styles.input} placeholder="Password" type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
          <input style={styles.input} placeholder="Confirm password" type="password" value={form.confirmPassword} onChange={(e) => setForm((s) => ({ ...s, confirmPassword: e.target.value }))} />
          <button type="submit" style={styles.button} disabled={saving}>{saving ? "Creating account..." : "Create account"}</button>
        </form>
        <p style={{ marginTop: 16, fontSize: 14, color: colors.muted }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
