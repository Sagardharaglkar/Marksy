import { createContext, useContext, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });

  function storeSession(token, userData) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  }

  function clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  async function resolveCode(college_code) {
    const res = await api.post("/auth/resolve-code", { college_code });
    return res.data; // { college_id, name }
  }

  async function login(college_id, phone, password) {
    const res = await api.post("/auth/login", { college_id, phone, password });
    storeSession(res.data.token, res.data.user);
    return res.data.user;
  }

  function logout() {
    clearSession();
  }

  const value = useMemo(
    () => ({ user, resolveCode, login, logout }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
