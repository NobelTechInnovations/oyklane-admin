"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Switch, Input, InputNumber, Button, App, Checkbox } from "antd";
import { Bike, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { currencySymbol, storeCurrency } from "@/lib/money";

const DAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

const fromServer = (s) => ({
  enabled: Boolean(s?.enabled),
  zones: (s?.zones || []).map((z) => ({ ...z, pinText: (z.pincodes || []).join(", ") })),
  slots: { enabled: true, windows: [], days: [1, 2, 3, 4, 5, 6], leadHours: 3, perSlot: 0, daysAhead: 5, ...(s?.slots || {}) },
  riders: s?.riders || [],
});

const toServer = (c) => ({
  enabled: c.enabled,
  zones: c.zones.map(({ id, name, pinText, fee, freeAbove, minOrder }) => ({ id, name, pincodes: pinText, fee, freeAbove, minOrder })),
  slots: c.slots,
  riders: c.riders.filter((r) => r.name?.trim()),
});

/** Local delivery: your own riders deliver to the PIN codes you choose, for
 * your fee, in the slots you offer. Shoppers see it at checkout when their
 * PIN code is in one of your zones (shipping/local.js). */
export function LocalDelivery() {
  const { message } = App.useApp();
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState(false);
  const sym = currencySymbol(storeCurrency());

  useEffect(() => {
    apiFetch("/api/shipping/local")
      .then((d) => setCfg(fromServer(d.settings)))
      .catch(() => setCfg(fromServer(null)));
  }, []);
  if (!cfg) return null;

  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const setZone = (i, patch) => set({ zones: cfg.zones.map((z, j) => (j === i ? { ...z, ...patch } : z)) });
  const setSlots = (patch) => set({ slots: { ...cfg.slots, ...patch } });
  const setRider = (i, patch) => set({ riders: cfg.riders.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const windows = cfg.slots.windows || [];
  const setWindow = (i, part, value) =>
    setSlots({
      windows: windows.map((w, j) => {
        if (j !== i) return w;
        const [a = "", b = ""] = w.split("-");
        return part === 0 ? `${value}-${b}` : `${a}-${value}`;
      }),
    });

  async function save(next = cfg, done = "Local delivery saved") {
    setBusy(true);
    try {
      const d = await apiFetch("/api/shipping/local", { method: "PUT", body: toServer(next) });
      setCfg(fromServer(d.settings));
      message.success(done);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card size="small" className="mt-6" styles={{ body: { padding: 20 } }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-bg text-ink">
            <Bike size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="m-0 text-sm font-semibold text-ink">Local delivery</p>
            <p className="m-0 mt-0.5 text-[13px] text-ink-muted">
              Deliver nearby orders with your own riders. Shoppers in your zones pay your delivery fee and pick a delivery slot at checkout. Track the day&apos;s deliveries in{" "}
              <Link href="/admin/orders/local-delivery">Orders ▸ Local delivery</Link>.
            </p>
          </div>
        </div>
        <Switch
          checked={cfg.enabled}
          loading={busy}
          onChange={(on) => save({ ...cfg, enabled: on }, on ? "Local delivery is on" : "Local delivery is off")}
          aria-label="Local delivery"
        />
      </div>

      <div className="mt-5">
        <p className="m-0 text-[13px] font-semibold text-ink">Zones</p>
        <p className="m-0 mt-0.5 text-[12px] text-ink-muted">Each zone is a list of PIN codes with its own fee. Orders under the minimum get your usual shipping.</p>
        <div className="mt-3 flex flex-col gap-3">
          {cfg.zones.map((z, i) => (
            <div key={z.id || i} className="rounded-lg border border-line p-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end">
                <label className="col-span-2 md:col-span-1">
                  <span className="mb-1 block text-[12px] text-ink-muted">Zone name</span>
                  <Input value={z.name} placeholder="e.g. City centre" maxLength={60} onChange={(e) => setZone(i, { name: e.target.value })} />
                </label>
                <label>
                  <span className="mb-1 block text-[12px] text-ink-muted">Delivery fee</span>
                  <InputNumber className="!w-full" min={0} prefix={sym} value={z.fee} onChange={(v) => setZone(i, { fee: v ?? 0 })} />
                </label>
                <label>
                  <span className="mb-1 block text-[12px] text-ink-muted">Free above</span>
                  <InputNumber className="!w-full" min={0} prefix={sym} value={z.freeAbove || null} placeholder="Never" onChange={(v) => setZone(i, { freeAbove: v ?? 0 })} />
                </label>
                <label>
                  <span className="mb-1 block text-[12px] text-ink-muted">Minimum order</span>
                  <InputNumber className="!w-full" min={0} prefix={sym} value={z.minOrder || null} placeholder="None" onChange={(v) => setZone(i, { minOrder: v ?? 0 })} />
                </label>
                <Button type="text" danger icon={<Trash2 size={16} />} aria-label={`Remove ${z.name || "zone"}`} onClick={() => set({ zones: cfg.zones.filter((_, j) => j !== i) })} />
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-[12px] text-ink-muted">PIN codes (separate with commas or spaces)</span>
                <Input.TextArea rows={2} value={z.pinText} placeholder="400001, 400002, 400003" onChange={(e) => setZone(i, { pinText: e.target.value })} />
              </label>
            </div>
          ))}
          <div>
            <Button icon={<Plus size={14} />} onClick={() => set({ zones: [...cfg.zones, { name: "", pinText: "", fee: 0, freeAbove: 0, minOrder: 0 }] })}>
              Add zone
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="m-0 text-[13px] font-semibold text-ink">Delivery slots</p>
            <p className="m-0 mt-0.5 text-[12px] text-ink-muted">Shoppers pick one at checkout. Without slots, orders are delivered on the day you choose.</p>
          </div>
          <Switch size="small" checked={cfg.slots.enabled !== false} onChange={(on) => setSlots({ enabled: on })} aria-label="Delivery slots" />
        </div>
        {cfg.slots.enabled !== false && (
          <div className="mt-3 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {windows.map((w, i) => {
                const [a = "", b = ""] = w.split("-");
                return (
                  <div key={i} className="flex items-center gap-2">
                    <Input type="time" className="!w-32" value={a} aria-label="Slot starts" onChange={(e) => setWindow(i, 0, e.target.value)} />
                    <span className="text-ink-muted">to</span>
                    <Input type="time" className="!w-32" value={b} aria-label="Slot ends" onChange={(e) => setWindow(i, 1, e.target.value)} />
                    <Button type="text" danger icon={<Trash2 size={16} />} aria-label="Remove slot" onClick={() => setSlots({ windows: windows.filter((_, j) => j !== i) })} />
                  </div>
                );
              })}
              <div>
                <Button size="small" icon={<Plus size={14} />} disabled={windows.length >= 8} onClick={() => setSlots({ windows: [...windows, "10:00-13:00"] })}>
                  Add slot
                </Button>
              </div>
            </div>
            <div>
              <span className="mb-1 block text-[12px] text-ink-muted">Days you deliver</span>
              <Checkbox.Group options={DAYS} value={cfg.slots.days} onChange={(days) => setSlots({ days })} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label>
                <span className="mb-1 block text-[12px] text-ink-muted">Hours to prepare an order</span>
                <InputNumber className="!w-full" min={0} max={72} value={cfg.slots.leadHours} onChange={(v) => setSlots({ leadHours: v ?? 0 })} />
              </label>
              <label>
                <span className="mb-1 block text-[12px] text-ink-muted">Orders per slot (0 = no limit)</span>
                <InputNumber className="!w-full" min={0} max={1000} value={cfg.slots.perSlot} onChange={(v) => setSlots({ perSlot: v ?? 0 })} />
              </label>
              <label>
                <span className="mb-1 block text-[12px] text-ink-muted">Days shoppers can book ahead</span>
                <InputNumber className="!w-full" min={1} max={14} value={cfg.slots.daysAhead} onChange={(v) => setSlots({ daysAhead: v ?? 5 })} />
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <p className="m-0 text-[13px] font-semibold text-ink">Riders</p>
        <p className="m-0 mt-0.5 text-[12px] text-ink-muted">Assign orders to them on the delivery board.</p>
        <div className="mt-3 flex flex-col gap-2">
          {cfg.riders.map((r, i) => (
            <div key={r.id || i} className="flex items-center gap-2">
              <Input className="!max-w-xs" value={r.name} placeholder="Name" maxLength={60} onChange={(e) => setRider(i, { name: e.target.value })} />
              <Input className="!max-w-[200px]" value={r.phone} placeholder="Phone" inputMode="tel" onChange={(e) => setRider(i, { phone: e.target.value })} />
              <Button type="text" danger icon={<Trash2 size={16} />} aria-label={`Remove ${r.name || "rider"}`} onClick={() => set({ riders: cfg.riders.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <div>
            <Button size="small" icon={<Plus size={14} />} onClick={() => set({ riders: [...cfg.riders, { name: "", phone: "" }] })}>
              Add rider
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="primary" loading={busy} onClick={() => save()}>
          Save local delivery
        </Button>
      </div>
    </Card>
  );
}
