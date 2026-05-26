import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import LoginPage from "./pages/LoginPage";
import SuperAdminPage from "./pages/SuperAdminPage";
import ClerkPage from "./pages/ClerkPage";
import FacultyPage from "./pages/FacultyPage";

function GuestRoute({ children }) {
  const { user } = useAuth();
  if (!user) return children;
  if (user.role === "super_admin") return <Navigate to="/super-admin" replace />;
  if (user.role === "clerk") return <Navigate to="/clerk" replace />;
  return <Navigate to="/faculty" replace />;
}

// Shows a warning toast 2 minutes before session expiry
function SessionWarning() {
  const { user, logout } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!user) { setSecondsLeft(null); return; }

    function tick() {
      const expires = Number(localStorage.getItem("session_expires") || 0);
      if (!expires) { setSecondsLeft(null); return; }
      const remaining = Math.floor((expires - Date.now()) / 1000);
      if (remaining <= 0) { setSecondsLeft(null); return; }
      // Show warning in the last 2 minutes
      setSecondsLeft(remaining <= 120 ? remaining : null);
    }

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [user]);

  if (!secondsLeft) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const label = mins > 0 ? `${mins}:${secs} min` : `${secondsLeft}s`;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-zinc-900 text-white text-xs font-mono px-4 py-3 rounded-xl shadow-xl border border-zinc-700">
      <span className="text-amber-400">⏱</span>
      <span>Session expires in <strong>{label}</strong></span>
      <button
        onClick={logout}
        className="ml-2 text-zinc-400 hover:text-white transition underline underline-offset-2"
      >
        Sign out
      </button>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <SessionWarning />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute role="super_admin">
                <SuperAdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clerk"
            element={
              <ProtectedRoute role="clerk">
                <ClerkPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty"
            element={
              <ProtectedRoute role="faculty">
                <FacultyPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}
