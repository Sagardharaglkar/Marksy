import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Network failure or server completely unreachable
    if (!err.response) {
      const msg = navigator.onLine
        ? "Server is unreachable. Please try again."
        : "You are offline. Check your internet connection.";
      return Promise.reject(Object.assign(err, { friendlyMessage: msg }));
    }

    // Only auto-logout on 401 if it's NOT a login/logout/forgot-password request
    const url = err.config?.url || "";
    const isAuthRequest = url.includes("/auth/login") || url.includes("/auth/logout") || url.includes("/auth/forgot-password") || url.includes("/auth/resolve-code");
    if (err.response?.status === 401 && localStorage.getItem("user") && !isAuthRequest) {
      localStorage.removeItem("user");
      localStorage.removeItem("session_expires");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
