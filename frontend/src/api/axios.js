import axios from "axios";

const api = axios.create({
  baseURL: "https://hei-stdhub-backend.onrender.com/api",
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
