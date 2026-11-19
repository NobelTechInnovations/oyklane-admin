"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { App, Button, Card, Checkbox, InputNumber, Select, Switch, Tag } from "antd";
import { apiFetch } from "@/lib/api";

const PRESETS = [
  { value: "1-week", label: "Every week" },
  { value: "2-week", label: "Every 2 weeks" },
  { value: "1-month", label: "Every month" },
  { value: "2-month", label: "Every 2 months" },
  { value: "3-month", label: "Every 3 months" },
];
const UNITS = [
  { value: "day", label: "days" },
  { value: "week", label: "weeks" },
  { value: "month", label: "months" },
];
const label = (v) => {
  const [n, unit] = v.split("-");
  return Number(n) === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`;
};

/**
 * Product form ▸ Subscriptions (customer-subscriptions/service.js): sell
 * this product on repeat, every N days, weeks or months, with a discount.
 * Saved on its own, separately from the product form.
 */
export function SubscriptionPlanCard({ productId, optional = false }) {
  const { message } = App.useApp();
  const [plan, setPlan] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [on, setOn] = useState(false);
  const [picked, setPicked] = useState(["1-month"]);
  const [pct, setPct] = useState(10);
  const [oneTime, setOneTime] = useState(true);
  const [custom, setCustom] = useState({ every: 10, unit: "day" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!productId) return;
    apiFetch(`/api/products/${productId}/subscription-plan`)
      .then((d) => {
        const p = d.plan;
        setPlan(p);
        if (p) {
          setOn(p.active);
          setPicked(p.intervals.map((i) => `${i.every}-${i.unit}`));
          setPct(p.discountPct);
          setOneTime(p.oneTime);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [productId]);

  async function save(next = {}) {
    const active = next.active ?? on;
    setBusy(true);
    try {
      const d = await apiFetch(`/api/products/${productId}/subscription-plan`, { method: "PUT", body: { active, intervals: picked, discountPct: pct || 0, oneTime } });
      setPlan(d.plan);
      setOn(d.plan.active);
      message.success(d.plan.active ? "Subscription options saved" : "No longer sold on subscription. Current subscribers keep getting their deliveries.");
    } catch (err) {
      message.error(err.message);
      if (next.active !== undefined) setOn(!next.active);
    } finally {
      setBusy(false);
    }
  }

  const extra = picked.filter((v) => !PRESETS.some((p) => p.value === v));
  // Optional (Settings ▸ Custom data ▸ Product page sections): shown only once the product has a plan.
  if (optional && !plan) return null;
  return (
    <Card size="small" title="Subscriptions">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-sm font-medium">Sell on subscription</p>
          <p className="m-0 mt-0.5 text-[13px] text-ink-muted">Shoppers choose how often it&apos;s delivered and save on every order. Each delivery is placed as a normal order.</p>
        </div>
        <Switch
          checked={on}
          loading={busy}
          disabled={!productId || !loaded}
          aria-label="Sell on subscription"
          onChange={(v) => {
            setOn(v);
            if (!v && plan) save({ active: false });
          }}
        />
      </div>
      {!productId && <p className="m-0 mt-2 text-[13px] text-ink-muted">Save the product first, then turn this on.</p>}
      {productId && on && (
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <p className="m-0 mb-1.5 text-[13px] font-medium">Delivery frequencies</p>
            <Checkbox.Group options={PRESETS} value={picked.filter((v) => PRESETS.some((p) => p.value === v))} onChange={(vals) => setPicked([...vals, ...extra])} />
            {extra.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {extra.map((v) => (
                  <Tag key={v} closable onClose={() => setPicked(picked.filter((x) => x !== v))}>
                    {label(v)}
                  </Tag>
                ))}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-ink-muted">Other:</span>
              <span>Every</span>
              <InputNumber size="small" min={1} max={custom.unit === "day" ? 90 : custom.unit === "week" ? 26 : 12} value={custom.every} onChange={(v) => setCustom({ ...custom, every: v || 1 })} aria-label="Every how many" className="!w-16" />
              <Select size="small" value={custom.unit} options={UNITS} onChange={(unit) => setCustom({ ...custom, unit })} className="!w-24" aria-label="Unit" />
              <Button size="small" onClick={() => !picked.includes(`${custom.every}-${custom.unit}`) && setPicked([...picked, `${custom.every}-${custom.unit}`])}>
                Add
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <label>
              <span className="mb-1 block text-[13px] font-medium">Discount on every delivery</span>
              <InputNumber min={0} max={90} value={pct} onChange={(v) => setPct(v ?? 0)} addonAfter="%" className="!w-32" />
            </label>
            <label className="flex items-center gap-2 pb-1.5 text-[13px]">
              <Switch size="small" checked={oneTime} onChange={setOneTime} />
              Also sell as a one-time purchase
            </label>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Link href="/admin/orders/subscriptions" className="text-[13px]">
              See subscribers
            </Link>
            <Button type="primary" loading={busy} disabled={!picked.length} onClick={() => save({ active: true })}>
              Save subscription options
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
