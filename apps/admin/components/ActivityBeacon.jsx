"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";

/** Dashboard pages opened, only when the merchant said yes (Settings ▸ Sign-in and privacy; API insights/service.js). */
export function ActivityBeacon() {
  const pathname = usePathname();
  const on = useRef(null);
  useEffect(() => {
    let alive = true;
    const send = () => on.current && apiFetch("/api/auth/activity", { method: "POST", body: { path: pathname } }).catch(() => {});
    if (on.current === null) {
      apiFetch("/api/auth/tracking")
        .then((t) => {
          on.current = Boolean(t?.on);
          if (alive) send();
        })
        .catch(() => (on.current = false));
    } else send();
    return () => {
      alive = false;
    };
  }, [pathname]);
  return null;
}
