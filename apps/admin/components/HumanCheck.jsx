"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

let scriptPromise = null;
function loadTurnstile() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error("turnstile"));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

/**
 * Cloudflare Turnstile on the sign-in pages — the check that a person, not
 * a bot, is signing in. Off (renders nothing, `ready` true) until Oyklane
 * saves its keys (Super admin ▸ Security). Usually invisible: it only asks
 * for a click when Cloudflare isn't sure.
 *
 * `token` goes in the request body as `turnstileToken`; it works once, so
 * call `reset()` after a failed attempt.
 */
export function useHumanCheck() {
  const widget = useRef(null);
  const [siteKey, setSiteKey] = useState(undefined);
  const [token, setToken] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    apiFetch("/api/auth/protection")
      .then((r) => setSiteKey(r?.turnstileSiteKey || null))
      .catch(() => setSiteKey(null));
  }, []);

  // A callback ref: the widget appears wherever the box is mounted (a
  // page can show it again on a later step, e.g. "send the code again").
  const box = useCallback(
    (node) => {
      if (widget.current != null) window.turnstile?.remove(widget.current);
      widget.current = null;
      if (!node || !siteKey) return;
      setToken(null);
      loadTurnstile()
        .then((ts) => {
          if (!ts || !node.isConnected || widget.current != null) return;
          widget.current = ts.render(node, {
            sitekey: siteKey,
            appearance: "interaction-only",
            size: "flexible",
            callback: (t) => {
              setFailed(false);
              setToken(t);
            },
            "expired-callback": () => setToken(null),
            "error-callback": () => {
              setToken(null);
              setFailed(true);
            },
          });
        })
        .catch(() => setFailed(true));
    },
    [siteKey]
  );

  const reset = () => {
    setToken(null);
    if (widget.current != null) window.turnstile?.reset(widget.current);
  };

  const element = siteKey ? (
    <div className="mb-2">
      <div ref={box} />
      {!token && <p className="m-0 mt-1 text-[12.5px] text-ink-muted">{failed ? "The security check couldn't load — refresh the page, or turn off a blocker for this site." : "Checking you're not a bot…"}</p>}
    </div>
  ) : null;

  return { element, token, ready: siteKey === null || Boolean(token), reset };
}
