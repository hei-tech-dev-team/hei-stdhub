import axios from "axios";
import { getAccessToken, getCsrfToken } from "./tokenStore";

const trimApi = (value) =>
  value
    .replace(/\/+$/, "")
    .replace(/\/api\/auth$/, "")
    .replace(/\/api$/, "");

const getAuthBaseUrl = () => {
  const configured = import.meta.env.VITE_AUTH_API_URL;
  if (configured) return `${trimApi(configured)}/api/auth`;

  if (import.meta.env.DEV) {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
    return `${trimApi(apiUrl)}/api/auth`;
  }

  return "/api/auth";
};

const authApi = axios.create({
  baseURL: getAuthBaseUrl(),
  withCredentials: true,
  timeout: 90000,
});

authApi.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const csrf = getCsrfToken();
  if (csrf) config.headers["X-CSRF-Token"] = csrf;
  return config;
});

export default authApi;
