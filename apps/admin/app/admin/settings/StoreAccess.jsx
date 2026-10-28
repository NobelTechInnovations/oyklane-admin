"use client";

import { useEffect, useState } from "react";
import { Card, Switch, Input, Button, App, Tag } from "antd";
import { Lock, Globe } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/track";
import { SettingsSectionHeader } from "./SettingsNav";

/** Store access: a new store opens locked behind a password, so nobody
 * finds it half-built. Turn it off to open the store to everyone. */
export function StoreAccess() {
  const { message } = App.useApp();
  const [lock, setLock] = useState(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    apiFetch("/api/store/lock")
      .then((d) => (setLock(d), setPassword(d.password || "")))
      .catch(() => setLock({ enabled: false, password: "" }));
  }, []);

  async function save(body, done) {
    setBusy(true);
    try {
      const d = await apiFetch("/api/store/lock", { method: "PUT", body });
      // Password protection switched off: the store is open to everyone.
      if (body.enabled === false && lock?.enabled) track("store_published");
      setLock(d);
      setPassword(d.password || "");
      message.success(done);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!lock) return null;
  return (
    <div className="mt-8">
      <SettingsSectionHeader title="Store access" description="Keep your store private with a password while you set it up." />
      <Card size="small" styles={{ body: { padding: 24 } }} className="max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${lock.enabled ? "bg-[#FEF3E2] text-status-warning" : "bg-[#E8F6EE] text-status-success"}`}>
              {lock.enabled ? <Lock size={18} aria-hidden="true" /> : <Globe size={18} aria-hidden="true" />}
            </span>
            <div>
              <p className="m-0 flex items-center gap-2 text-sm font-semibold text-ink">
                Password protection {lock.enabled ? <Tag color="warning" className="!m-0">On — store is private</Tag> : <Tag color="success" className="!m-0">Off — store is live</Tag>}
              </p>
              <p className="m-0 mt-1 text-[13px] text-ink-muted">
                {lock.enabled ? "Visitors see an “opening soon” page and need the password to enter." : "Anyone can visit your store."}
              </p>
            </div>
          </div>
          <Switch checked={lock.enabled} loading={busy} onChange={(on) => save({ enabled: on }, on ? "Store locked with a password" : "Your store is live for everyone")} aria-label="Password protection" />
        </div>
        {lock.enabled && (
          <div className="mt-5 flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[220px]">
              <span className="mb-1 block text-[13px] text-ink">Store password</span>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} maxLength={40} autoComplete="off" />
            </label>
            <Button disabled={busy || password.trim() === lock.password} onClick={() => save({ password }, "Password changed — share the new one")}>
              Change password
            </Button>
            <p className="m-0 w-full text-[12px] text-ink-muted">Changing it asks everyone who had the old password to enter the new one.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
