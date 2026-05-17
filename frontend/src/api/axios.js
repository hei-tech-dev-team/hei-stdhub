import axios from "axios";

const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  return configuredUrl.replace(/\/+$/, "").replace(/\/api$/, "") + "/api";
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000, // 15 seconds timeout
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("hei_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || "";

    // Skip redirect for auth routes
    const isAuthRoute = /\/auth\//.test(url);

    // Handle Maintenance Mode (503)
    if (status === 503 && !isAuthRoute) {
      window.location.href = "/maintenance";
      return Promise.reject(err);
    }

    // Handle Server Error (500)
    if (status === 500 && !isAuthRoute) {
      window.location.href = "/500";
      return Promise.reject(err);
    }

    // Handle Unauthorized (401)
    if (status === 401 && !isAuthRoute) {
      localStorage.removeItem("hei_token");
      window.location.href = "/login";
      return Promise.reject(err);
    }

    // Network errors or other cases
    return Promise.reject(err);
  }
);

export default api;