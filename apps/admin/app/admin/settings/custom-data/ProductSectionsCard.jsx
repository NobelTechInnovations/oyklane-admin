"use client";

import { useState } from "react";
import { App, Card, Switch } from "antd";
import { apiFetch } from "@/lib/api";

const SECTIONS = [
  { key: "preorder", title: "Pre-orders", text: "Keep selling a product when it's out of stock, with a ship-by date." },
  { key: "digital", title: "Digital products", text: "Sell files (e-books, courses, music, templates) that buyers download once they've paid." },
  { key: "subscriptions", title: "Subscriptions", text: "Shoppers choose how often a product is delivered and save on every order." },
];

/** Settings ▸ Custom data: which optional sections the product form shows. */
export function ProductSectionsCard({ initial = {}, canEdit }) {
  const { message } = App.useApp();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(null);
  async function toggle(key, on) {
    setBusy(key);
    try {
      await apiFetch("/api/store", { method: "PATCH", body: { settings: { productSections: { [key]: on } } } });
      setValue((v) => ({ ...v, [key]: on }));
      message.success(on ? "Shown on every product" : "Hidden from products that don't use it");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <Card size="small" title="Product page sections" className="mb-6">
      <p className="m-0 mb-3 text-[13px] text-ink-muted">Turn on only what you sell. A product that already uses one keeps showing it.</p>
      <div className="flex flex-col divide-y divide-line">
        {SECTIONS.map((s) => (
          <label key={s.key} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{s.title}</span>
              <span className="block text-[13px] text-ink-muted">{s.text}</span>
            </span>
            <Switch checked={Boolean(value[s.key])} loading={busy === s.key} disabled={!canEdit} onChange={(on) => toggle(s.key, on)} aria-label={s.title} />
          </label>
        ))}
      </div>
    </Card>
  );
}
