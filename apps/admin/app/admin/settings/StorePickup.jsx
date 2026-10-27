"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Switch, Input, Button, App, Alert, Select } from "antd";
import { MapPin } from "lucide-react";
import { apiFetch } from "@/lib/api";

/** Store pickup: customers collect orders from your store — no delivery
 * charge. Offered at checkout only when the delivery address is in the
 * pickup zone: your store's PIN code plus the ones you add here. */
export function StorePickup() {
  const { message } = App.useApp();
  const [store, setStore] = useState(null);
  const [note, setNote] = useState("");
  const [pins, setPins] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    apiFetch("/api/store")
      .then((d) => (setStore(d.store), setNote(d.store?.settings?.pickup?.note || ""), setPins(d.store?.settings?.pickup?.pincodes || [])))
      .catch(() => {});
  }, []);
  if (!store) return null;
  const pickup = store.settings?.pickup || {};
  const a = store.settings?.storeAddress || {};
  const hasAddress = a.address1 && a.city && a.province && a.zip;

  async function save(patch, done) {
    setBusy(true);
    try {
      const d = await apiFetch("/api/store", { method: "PATCH", body: { settings: { pickup: { ...pickup, ...patch } } } });
      setStore(d.store || { ...store, settings: { ...store.settings, pickup: { ...pickup, ...patch } } });
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
            <MapPin size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="m-0 text-sm font-semibold text-ink">Store pickup</p>
            <p className="m-0 mt-0.5 text-[13px] text-ink-muted">Customers whose delivery address is in your pickup zone can collect their order from your store, with no delivery charge.</p>
          </div>
        </div>
        <Switch checked={Boolean(pickup.enabled)} loading={busy} disabled={!hasAddress} onChange={(on) => save({ enabled: on }, on ? "Store pickup is on" : "Store pickup is off")} aria-label="Store pickup" />
      </div>
      {!hasAddress ? (
        <Alert className="!mt-4" type="info" showIcon message={<span>Add your store address first, in <Link href="/admin/settings">Settings ▸ General</Link>.</span>} />
      ) : (
        <div className="mt-4">
          <p className="m-0 text-[13px] text-ink">
            Pickup address: <span className="text-ink-muted">{[a.address1, a.city, `${a.province} ${a.zip}`].join(", ")}</span>
          </p>
          <div className="mt-4">
            <span className="mb-1 block text-[13px] text-ink">Pickup zone — PIN codes</span>
            <div className="flex flex-wrap items-start gap-2">
              <Select
                mode="tags"
                className="min-w-[240px] flex-1"
                value={pins}
                onChange={(v) => setPins([...new Set(v.map((p) => String(p).replace(/\D/g, "")).filter((p) => /^\d{6}$/.test(p)))])}
                tokenSeparators={[",", " "]}
                placeholder="Type PIN codes, e.g. 303338, 303339"
                open={false}
                aria-label="Pickup zone PIN codes"
              />
              <Button disabled={busy || JSON.stringify(pins) === JSON.stringify(pickup.pincodes || [])} onClick={() => save({ pincodes: pins }, "Pickup zone saved")}>
                Save zone
              </Button>
            </div>
            <p className="m-0 mt-1 text-[12px] text-ink-muted">Your store&apos;s PIN code ({a.zip}) is always included. Only these addresses see “Pick up from store” at checkout.</p>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="min-w-[240px] flex-1">
              <span className="mb-1 block text-[13px] text-ink">Note for customers (optional)</span>
              <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Ready in 2 hours · 11am–8pm, Mon–Sat" />
            </label>
            <Button disabled={busy || note === (pickup.note || "")} onClick={() => save({ note }, "Pickup note saved")}>
              Save note
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
