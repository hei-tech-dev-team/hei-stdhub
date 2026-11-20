import authApi from "./authApi";
import { setSession, getCsrfToken, clearSession } from "./tokenStore";

let refreshPromise = null;

export const applyAuthResponse = (data) => {
  if (data?.token) {
    setSession({
      token: data.token,
      expiresIn: data.expires_in,
      csrfToken: data.csrf_token,
    });
  }
  return data;
};

export const refreshAccessToken = () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = authApi
    .post("/refresh")
    .then(({ data }) => {
      setSession({
        token: data.token,
        expiresIn: data.expires_in,
        csrfToken: getCsrfToken(),
      });
      return data;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

export const clearAuth = () => {
  clearSession();
};
