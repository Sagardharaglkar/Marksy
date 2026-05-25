import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
  );
}
