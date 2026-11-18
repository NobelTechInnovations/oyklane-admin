"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * The signed-in member's custom role (API lib/permissions.js): null when
 * nothing limits them (owners, admins, staff without a role). Loaded once
 * per page load and shared.
 */
let cached;
let pending = null;

export function usePermissions() {
  const [perms, setPerms] = useState(cached);
  useEffect(() => {
    if (cached !== undefined) return;
    pending =
      pending ||
      apiFetch("/api/team/me")
        .then((d) => (cached = d.permissions || null))
        .catch(() => (cached = null));
    pending.then((p) => setPerms(p));
  }, []);
  return perms;
}

/** Can open an area (view or manage)? */
export const canOpen = (perms, area) => !perms || !area || (perms[area] && perms[area] !== "none");
