import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../lib/api.js";
import { colors, styles } from "../styles.js";

function NavLink({ to, children, current }) {
  return (
    <Link
      to={to}
      style={{
        textDecoration: "none",
        color: current ? colors.primary : "#dbeafe",
        fontWeight: current ? 800 : 600,
        padding: "10px 14px",
        borderRadius: 12,
        background: current ? "white" : "rgba(255,255,255,0.08)",
      }}
    >
      {children}
    </Link>
  );
}

export default function NavBar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    api.getNotifications().then((res) => {
      if (active) setUnreadCount(res.unreadCount || 0);
    }).catch(() => {});
    return () => { active = false; };
  }, [location.pathname]);

  return (
    <div style={{ background: "#0f172a", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 10px 24px rgba(0,0,0,0.12)" }}>
      <div style={{ maxWidth: 1220, margin: "0 auto", padding: "14px 24px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, color: "white" }}>Campus Service Desk</div>
          <div style={{ fontSize: 12, color: "#93c5fd" }}>tickets, assets, queue tracking, and support articles</div>
        </div>
        <div style={{ display: "flex", gap: 6, marginLeft: 24, flexWrap: "wrap" }}>
          <NavLink to="/" current={location.pathname === "/"}>Dashboard</NavLink>
          <NavLink to="/tickets" current={location.pathname.startsWith("/tickets")}>Tickets</NavLink>
          <NavLink to="/queues" current={location.pathname.startsWith("/queues")}>Queues</NavLink>
          <NavLink to="/assets" current={location.pathname.startsWith("/assets")}>Assets</NavLink>
          <NavLink to="/knowledge" current={location.pathname.startsWith("/knowledge")}>Knowledge Base</NavLink>
          {user?.role === "ADMIN" ? <NavLink to="/admin" current={location.pathname.startsWith("/admin")}>Admin</NavLink> : null}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ ...styles.badge, background: "rgba(255,255,255,0.1)", color: "white" }}>Notifications {unreadCount}</div>
          <div style={{ textAlign: "right", color: "white" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{user?.email}</div>
            <div style={{ fontSize: 12, color: "#93c5fd" }}>{user?.role}</div>
          </div>
          <button onClick={logout} style={styles.secondaryButton}>Logout</button>
        </div>
      </div>
    </div>
  );
}
