const CSRF_KEY = "hei_csrf";

let accessToken = null;
let expiresAt = 0;
let csrfToken = null;

const readCsrf = () => {
  if (csrfToken) return csrfToken;
  try {
    csrfToken = localStorage.getItem(CSRF_KEY);
  } catch {
    csrfToken = null;
  }
  return csrfToken;
};

export const setSession = ({ token, expiresIn, csrfToken: nextCsrf }) => {
  accessToken = token || null;
  expiresAt = token ? Date.now() + Number(expiresIn || 0) * 1000 : 0;
  if (nextCsrf) {
    csrfToken = nextCsrf;
    try {
      localStorage.setItem(CSRF_KEY, nextCsrf);
    } catch {}
  }
};

export const clearSession = () => {
  accessToken = null;
  expiresAt = 0;
  csrfToken = null;
  try {
    localStorage.removeItem(CSRF_KEY);
  } catch {}
};

export const getAccessToken = () => accessToken;

export const getCsrfToken = () => readCsrf();

export const hasSessionHint = () => Boolean(readCsrf());

export const isAccessTokenExpiringSoon = (seconds = 90) =>
  Boolean(accessToken) &&
  expiresAt > 0 &&
  expiresAt - Date.now() <= seconds * 1000;

export const clearLegacyStorage = () => {
  try {
    localStorage.removeItem("hei_token");
    localStorage.removeItem("hei_user");
  } catch {}
};
