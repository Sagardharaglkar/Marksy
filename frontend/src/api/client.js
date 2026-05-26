import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // If 401 and user data exists, session expired — clear and redirect to login
    if (err.response?.status === 401 && localStorage.getItem("user")) {
      localStorage.removeItem("user");
      localStorage.removeItem("session_expires");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
