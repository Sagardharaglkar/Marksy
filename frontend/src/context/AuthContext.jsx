import { createContext, useContext, useEffect, useRef, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

// Idle timeout per role (ms). super_admin has no timeout.
const IDLE_TIMEOUTS = {
  clerk:   30 * 60 * 1000,
  faculty: 60 * 60 * 1000,
};

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });

  const timerRef = useRef(null);

  function storeSession(token, userData) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  }

  function clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("session_expires");
    setUser(null);
  }

  // Schedule auto-logout after the idle timeout. Call this on login and on each activity event.
  function resetIdleTimer(role) {
    const timeout = IDLE_TIMEOUTS[role];
    if (!timeout) return; // super_admin — no timeout

    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    const expires = Date.now() + timeout;
    localStorage.setItem("session_expires", String(expires));

    timerRef.current = setTimeout(() => {
      clearSession();
    }, timeout);
  }

  // Attach activity listeners that reset the idle timer
  useEffect(() => {
    if (!user || !IDLE_TIMEOUTS[user.role]) return;

    // On mount, check if session already expired (e.g. user left tab open)
    const stored = localStorage.getItem("session_expires");
    if (stored && Date.now() > Number(stored)) {
      clearSession();
      return;
    }

    // Resume timer for remaining time
    const remaining = stored ? Number(stored) - Date.now() : IDLE_TIMEOUTS[user.role];
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => clearSession(), Math.max(remaining, 0));

    function onActivity() { resetIdleTimer(user.role); }

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }));

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, onActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user?.role]);

  async function resolveCode(college_code) {
    const res = await api.post("/auth/resolve-code", { college_code });
    return res.data;
  }

  async function login(college_id, phone, password, college_name) {
    const res = await api.post("/auth/login", { college_id, phone, password });
    const userData = college_name ? { ...res.data.user, college_name } : res.data.user;
    storeSession(res.data.token, userData);
    resetIdleTimer(res.data.user.role);
    return userData;
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
