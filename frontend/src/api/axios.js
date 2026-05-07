import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL + "/api"
    : "http://localhost:3001/api",
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

    // Ne rediriger que si c'est un vrai 401 et pas un problème réseau
    const is401 = err.response?.status === 401;
    const isNetworkError = !err.response;

    if (is401 && !isAuthRoute && !isNetworkError) {
      localStorage.removeItem("hei_token");
      window.location.href = "/login";
    }

    return Promise.reject(err);
  },
);

export default api;
