import axios from "axios";

const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  return configuredUrl.replace(/\/+$/, "").replace(/\/api$/, "") + "/api";
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 90000,
});

const SLOW_REQUEST_DELAY = 4000;
const RETRYABLE_STATUS = [502, 503, 504];
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

let slowCount = 0;

const notifySlowCount = () => {
  window.dispatchEvent(new CustomEvent("api:slow", { detail: { count: slowCount } }));
}

const markSlow = (config) => {
  if (config.__isSlow) return;
  config.__isSlow = true;
  slowCount++;
  notifySlowCount();
}

const finishRequest = (config) => {
  if (!config) return;
  clearTimeout(config.__slowTimer);
  if (config.__isSlow) {
    config.__isSlow = false;
    slowCount--;
    notifySlowCount();
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("hei_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  clearTimeout(config.__slowTimer);
  if (!config.__isSlow) {
    config.__slowTimer = setTimeout(() => markSlow(config), SLOW_REQUEST_DELAY);
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    finishRequest(res.config);
    return res;
  },
  async (err) => {
    const config = err.config;
    const status = err.response?.status;

    const canRetry =
      config &&
      config.method === "get" &&
      RETRYABLE_STATUS.includes(status) &&
      (config.__retryCount || 0) < MAX_RETRIES;

    if (canRetry) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      markSlow(config);
      await sleep(RETRY_DELAY);
      return api.request(config);
    }

    finishRequest(config);

    const url = config?.url || "";
    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/password") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password") ||
      url.includes("/auth/register") ||
      url.includes("/auth/verify-invite");

    if (status === 401 && !isAuthRoute) {
      localStorage.removeItem("hei_token");
      window.location.href = "/login";
    }

    if (status === 503) {
      window.location.href = "/maintenance";
    } else if (status === 418) {
      window.location.href = "/teapot";
    } else if (status >= 500) {
      window.location.href = "/server-error";
    }

    if (err.code === "ECONNABORTED" && !err.response) {
      err.userMessage = "Le chargement peut varier selon la connexion, merci de patienter...";
    }

    return Promise.reject(err);
  },
);

export default api;
