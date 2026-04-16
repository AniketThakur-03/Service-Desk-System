
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(localStorage.getItem("accessToken") || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        if (accessToken) api.setAccessToken(accessToken);
        const me = await api.getMe();
        setUser(me.user);
      } catch {
        api.setAccessToken("");
        localStorage.removeItem("accessToken");
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  const storeSession = (res) => {
    api.setAccessToken(res.accessToken);
    localStorage.setItem("accessToken", res.accessToken);
    setAccessToken(res.accessToken);
    setUser(res.user);
  };

  const value = useMemo(
    () => ({
      user,
      accessToken,
      loading,
      async login(email, password) {
        const res = await api.login(email, password);
        storeSession(res);
      },
      async register(email, password) {
        const res = await api.register(email, password);
        storeSession(res);
      },
      async logout() {
        try { await api.logout(); } catch {}
        api.setAccessToken("");
        localStorage.removeItem("accessToken");
        setAccessToken("");
        setUser(null);
      },
    }),
    [user, accessToken, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
