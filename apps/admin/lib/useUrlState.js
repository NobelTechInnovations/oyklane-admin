"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A tab, view or filter kept in the page address (?tab=wallet): a refresh,
 * the back button or a shared link opens the same one. `allowed` limits
 * the values read from the address; the default is left out of it.
 *
 *   const [tab, setTab] = useUrlState("tab", "couriers", ["couriers", "wallet"]);
 */
export function useUrlState(param, fallback, allowed) {
  const allowedRef = useRef(allowed);
  allowedRef.current = allowed;
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    const read = () => {
      const raw = new URLSearchParams(window.location.search).get(param);
      // Older links used #tab; read that too.
      const hash = window.location.hash.slice(1);
      const list = allowedRef.current;
      const ok = (v) => v != null && v !== "" && (!list || list.includes(v));
      setValue(ok(raw) ? raw : param === "tab" && ok(hash) && list ? hash : fallback);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [param, fallback]);

  const set = useCallback(
    (next) => {
      setValue(next);
      try {
        const u = new URL(window.location.href);
        if (next == null || next === fallback) u.searchParams.delete(param);
        else u.searchParams.set(param, String(next));
        window.history.replaceState(window.history.state, "", `${u.pathname}${u.search}${u.hash}`);
      } catch {
        /* address can't change: the state still does */
      }
    },
    [param, fallback]
  );

  return [value, set];
}
