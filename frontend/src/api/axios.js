import axios from "axios";

const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  return configuredUrl.replace(/\/+$/, "").replace(/\/api$/, "") + "/api";
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("hei_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || "";
    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/password") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password") ||
      url.includes("/auth/register") ||
      url.includes("/auth/verify-invite");

    const is401 = err.response?.status === 401;
    const isNetworkError = !err.response;

    if (is401 && !isAuthRoute && !isNetworkError) {
      localStorage.removeItem("hei_token");
      window.location.href = "/login";
    }

    if (err.code === "ECONNABORTED" && !err.response) {
      err.userMessage = "Le serveur démarre, veuillez patienter quelques instants...";
    }

    return Promise.reject(err);
  },
);

export default api;
