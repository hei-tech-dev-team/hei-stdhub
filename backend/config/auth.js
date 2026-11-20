const ACCESS_TOKEN_TTL_SECONDS = parseInt(
  process.env.ACCESS_TOKEN_TTL_SECONDS || "900",
  10,
);
const REFRESH_TOKEN_TTL_DAYS = parseInt(
  process.env.REFRESH_TOKEN_TTL_DAYS || "30",
  10,
);
const REFRESH_REUSE_GRACE_SECONDS = parseInt(
  process.env.REFRESH_REUSE_GRACE_SECONDS || "15",
  10,
);
const AUTH_CACHE_TTL_MS =
  process.env.NODE_ENV === "test"
    ? 0
    : parseInt(process.env.AUTH_CACHE_TTL_MS || "15000", 10);
const JWT_ISSUER = process.env.JWT_ISSUER || "hei-stdhub-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "hei-stdhub-web";
const REFRESH_COOKIE_NAME = "hei_refresh";
const REFRESH_COOKIE_PATH = "/api/auth";
const MAX_SESSIONS_PER_USER = parseInt(
  process.env.MAX_SESSIONS_PER_USER ||
    (process.env.NODE_ENV === "test" ? "1000" : "20"),
  10,
);
const SESSION_RETENTION_DAYS = parseInt(
  process.env.SESSION_RETENTION_DAYS || "30",
  10,
);

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: REFRESH_COOKIE_PATH,
  maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
});

const clearCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: REFRESH_COOKIE_PATH,
});

module.exports = {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_DAYS,
  REFRESH_REUSE_GRACE_SECONDS,
  AUTH_CACHE_TTL_MS,
  JWT_ISSUER,
  JWT_AUDIENCE,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  MAX_SESSIONS_PER_USER,
  SESSION_RETENTION_DAYS,
  cookieOptions,
  clearCookieOptions,
};
