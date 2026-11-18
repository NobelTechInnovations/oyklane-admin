"use client";

import { createContext, useContext } from "react";

/**
 * The ads coach's screens (planner, chat panel, coach tips, A/B tests,
 * analytics) are shared by the seller dashboard and Super admin ▸ Ads
 * Manager. Each app says how to reach its Meta Ads routes:
 *
 *   <AdsCoachProvider api={{
 *     request: (path, opts) => apiFetch(`/api/meta-ads${path}`, opts),  // JSON calls
 *     url: (path) => `${API_URL}/api/meta-ads${path}`,                  // the streamed chat
 *     products: () => …,          // → [{ id, title }] for the planner
 *     money: (n) => "₹1,200",     // in the ad account's currency
 *     currency: "INR",
 *     mode: "seller" | "managed", // managed: Oyklane runs the ads
 *     canEdit: true,              // owner/admin (or Oyklane): may change live ads
 *   }}>
 */
const AdsCoachContext = createContext(null);

export function AdsCoachProvider({ api, children }) {
  return <AdsCoachContext.Provider value={api}>{children}</AdsCoachContext.Provider>;
}

export function useAdsCoach() {
  const api = useContext(AdsCoachContext);
  if (!api) throw new Error("Wrap the ads coach in <AdsCoachProvider>.");
  return api;
}

/**
 * POSTs and reads a newline-delimited JSON stream, handing each event
 * ({ type: "start" | "delta" | "done" | "error" }) to `onEvent` as it arrives.
 */
export async function streamNdjson(url, body, onEvent, signal) {
  const res = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  if (!res.ok) {
    let msg = "Couldn't reach the coach. Try again.";
    try {
      const data = await res.json();
      msg = data.error || data.message || msg;
    } catch {}
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const emit = (line) => {
    if (!line.trim()) return;
    try {
      onEvent(JSON.parse(line));
    } catch {}
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut;
    while ((cut = buffer.indexOf("\n")) >= 0) {
      emit(buffer.slice(0, cut));
      buffer = buffer.slice(cut + 1);
    }
  }
  emit(buffer);
}
