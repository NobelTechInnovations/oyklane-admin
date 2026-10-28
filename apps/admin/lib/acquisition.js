/**
 * Where a new seller came from (Super admin ▸ Acquisition). oyklane.com and
 * the Oyklane Store keep the visit's UTM tags in the `oy_utm` cookie on
 * .oyklane.com; a link straight to /register?utm_source=… is kept here too.
 * Sent with sign-up.
 */
const KEYS = ["source", "medium", "campaign", "term", "content"];

export function rememberUtm() {
  try {
    const q = new URLSearchParams(window.location.search);
    const utm = Object.fromEntries(KEYS.map((k) => [k, q.get(`utm_${k}`) || ""]).filter(([, v]) => v));
    if (!utm.source) return;
    const shared = /(^|\.)oyklane\.com$/i.test(window.location.hostname) ? "; domain=.oyklane.com" : "";
    const value = { ...utm, landing: window.location.pathname, at: new Date().toISOString() };
    document.cookie = `oy_utm=${encodeURIComponent(JSON.stringify(value))}${shared}; path=/; max-age=${90 * 86400}; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
  } catch {}
}

export function acquisition() {
  try {
    const raw = document.cookie.split("; ").find((c) => c.startsWith("oy_utm="));
    return raw ? JSON.parse(decodeURIComponent(raw.slice(7))) : undefined;
  } catch {
    return undefined;
  }
}
