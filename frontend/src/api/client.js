import axios from "axios";

const api = axios.create({
  // baseURL: import.meta.env.VITE_API_URL || "http://192.168.1.6:5000/api",
  baseURL: "http://192.168.1.6:5000/api",
});
//
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only redirect on 401 if a token exists (i.e. session expired, not a login attempt)
    if (err.response?.status === 401 && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
