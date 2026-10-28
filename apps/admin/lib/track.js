/**
 * Oyklane's own funnel analytics — GA4 and the Meta pixel, loaded by
 * components/Analytics.jsx when NEXT_PUBLIC_GA_ID / NEXT_PUBLIC_META_PIXEL_ID
 * are set (otherwise every call here does nothing). Events carry no shopper
 * or order details — only that a step happened:
 *   sign_up · store_created · first_product_added · gateway_connected ·
 *   store_published · first_order
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

// Meta's standard event names, where one fits; the rest are custom events.
const META_STANDARD = { sign_up: "CompleteRegistration" };

export function track(event, params = {}) {
  if (typeof window === "undefined") return;
  if (GA_ID) {
    try {
      // Queues the event if gtag.js hasn't loaded yet.
      window.dataLayer = window.dataLayer || [];
      window.gtag =
        window.gtag ||
        function gtag() {
          window.dataLayer.push(arguments);
        };
      window.gtag("event", event, { ...params, transport_type: "beacon" });
    } catch {}
  }
  if (META_PIXEL_ID && window.fbq) {
    try {
      if (META_STANDARD[event]) window.fbq("track", META_STANDARD[event], params);
      else window.fbq("trackCustom", event, params);
    } catch {}
  }
}

/** Reports an event at most once per browser for `id` (e.g. a store's first order). */
export function trackOnce(event, id, params = {}) {
  if (typeof window === "undefined" || (!GA_ID && !META_PIXEL_ID)) return;
  const key = `oy_tracked_${event}_${id}`;
  try {
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, "1");
  } catch {
    return;
  }
  track(event, params);
}
