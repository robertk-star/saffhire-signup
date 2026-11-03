export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

function urlOnCurrentSite(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, window.location.origin);
}

function urlFromBase(path: string, base: string) {
  const trimmed = base.trim().replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!trimmed) return urlOnCurrentSite(normalizedPath);
  const absoluteBase = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(`${absoluteBase}${normalizedPath}`);
  } catch {
    return urlOnCurrentSite(normalizedPath);
  }
}

// Login stays on this site when the OAuth portal URL was not provided at build time.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID ?? "";
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);
  const url = urlFromBase("/app-auth", typeof oauthPortalUrl === "string" ? oauthPortalUrl : "");
  url.searchParams.set("appId", String(appId));
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  return url.toString();
};

export function toAbsoluteAppUrl(url: string) {
  const value = (url || "").trim();
  if (!value) return window.location.origin;
  try {
    if (/^https?:\/\//i.test(value)) return new URL(value).toString();
  } catch {
    // A bad absolute value still falls back to this site.
  }
  return urlOnCurrentSite(value).toString();
}
