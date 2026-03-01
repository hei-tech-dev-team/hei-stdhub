import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL + "/api"
    : "http://localhost:3001/api",
});

// Injecte le token JWT automatiquement
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("hei_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirige vers /login si token expiré
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("hei_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export default api;
