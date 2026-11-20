"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, Switch, Table } from "antd";
import { apiFetch } from "@/lib/api";
import { SettingsSectionHeader } from "../SettingsNav";

/** Settings ▸ Sign-in and privacy: devices with a saved login, and whether Oyklane may learn from how you use the dashboard. */
export default function SignInSettingsPage() {
  const { message } = App.useApp();
  const [devices, setDevices] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    apiFetch("/api/auth/devices").then((d) => setDevices(d.devices)).catch(() => setDevices([]));
    apiFetch("/api/auth/tracking").then(setTracking).catch(() => setTracking({ on: false }));
  }, []);
  async function remove(id) {
    try {
      await apiFetch(`/api/auth/devices/${id}`, { method: "DELETE" });
      setDevices((list) => list.filter((d) => d.id !== id));
      message.success("That device asks for your password again");
    } catch (err) {
      message.error(err.message);
    }
  }
  async function toggle(on) {
    setBusy(true);
    try {
      setTracking(await apiFetch("/api/auth/tracking", { method: "PUT", body: { on } }));
      message.success(on ? "Thanks. Oyklane will learn from how you use the dashboard." : "Turned off, and what was kept is deleted.");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  const day = (d) => new Date(d).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  return (
    <div>
      <SettingsSectionHeader title="Sign-in and privacy" description="Devices where you saved your login when signing out, and what Oyklane may learn from how you use it." />
      <Card size="small" title="Saved logins" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          size="middle"
          loading={!devices}
          dataSource={devices || []}
          pagination={false}
          locale={{ emptyText: "No device saves your login. You can save it when you sign out." }}
          columns={[
            { title: "Device", dataIndex: "label" },
            { title: "Saved", dataIndex: "createdAt", width: 130, render: day },
            { title: "Last used", dataIndex: "lastUsedAt", width: 130, render: day },
            { title: "Ends", dataIndex: "expiresAt", width: 130, render: day },
            {
              title: "",
              width: 100,
              align: "right",
              render: (_, d) => (
                <Button size="small" danger type="text" onClick={() => remove(d.id)}>
                  Remove
                </Button>
              ),
            },
          ]}
        />
      </Card>
      <Card size="small" title="Help improve Oyklane" className="mt-6">
        <label className="flex items-start justify-between gap-4">
          <span className="text-[13px] text-ink-muted">Let Oyklane learn from which dashboard pages you use, to make them better. Only Oyklane sees it, it&apos;s kept 18 months, and turning it off deletes it.</span>
          <Switch checked={Boolean(tracking?.on)} loading={!tracking || busy} onChange={toggle} aria-label="Help improve Oyklane" />
        </label>
      </Card>
    </div>
  );
}
