"use client";

import { useState } from "react";
import { Alert, App, Button, Card, InputNumber, Switch } from "antd";
import { apiFetch } from "@/lib/api";

/**
 * Settings ▸ Checkout ▸ COD and RTO protection (API orders/risk.js): which
 * scores are flagged, and whether high scorers must pay online.
 */
export function RiskSettings({ initial, canEdit }) {
  const { message } = App.useApp();
  const [values, setValues] = useState({ flagAbove: initial?.flagAbove ?? 50, blockCodAbove: initial?.blockCodAbove ?? null });
  const [saved, setSaved] = useState(values);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const set = (patch) => setValues((v) => ({ ...v, ...patch }));

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/api/store", { method: "PATCH", body: { settings: { risk: values } } });
      setSaved(values);
      message.success("Saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card size="small" title="COD and RTO protection" className="mt-5">
      <p className="m-0 text-[13px] text-ink-muted">
        Every order gets a delivery risk score from 0 to 100: how likely it is to come back undelivered. It&apos;s based on the shopper&apos;s earlier orders across Oyklane, the address and how often parcels to its PIN code come back, and it learns from what actually gets delivered or returned.
      </p>
      <ul className="m-0 mt-2 list-none divide-y divide-app-border p-0">
        <li className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0 flex-1 basis-60">
            <p className="m-0 text-sm font-medium">Mark as high risk</p>
            <p className="m-0 mt-0.5 text-[13px] text-ink-muted">Orders scoring this or more are marked on the order list and page, so you can confirm before shipping.</p>
          </div>
          <InputNumber min={10} max={95} value={values.flagAbove} disabled={!canEdit} onChange={(v) => set({ flagAbove: Number(v) || 50 })} addonAfter="or more" style={{ width: 150 }} aria-label="High risk from score" />
        </li>
        <li className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0 flex-1 basis-60">
            <p className="m-0 text-sm font-medium">Turn off cash on delivery for risky orders</p>
            <p className="m-0 mt-0.5 text-[13px] text-ink-muted">At checkout, shoppers scoring this or more are asked to pay online instead. Everyone else can still choose cash on delivery.</p>
          </div>
          <span className="flex items-center gap-3">
            <Switch checked={values.blockCodAbove != null} disabled={!canEdit} onChange={(on) => set({ blockCodAbove: on ? 80 : null })} aria-label="Turn off cash on delivery for risky orders" />
            <InputNumber min={30} max={99} value={values.blockCodAbove ?? 80} disabled={!canEdit || values.blockCodAbove == null} onChange={(v) => set({ blockCodAbove: Number(v) || 80 })} addonAfter="or more" style={{ width: 150 }} aria-label="Turn off cash on delivery from score" />
          </span>
        </li>
      </ul>
      {values.blockCodAbove != null && values.blockCodAbove < 50 && <Alert type="warning" showIcon message="A low limit turns cash on delivery off for many genuine shoppers too. 70–85 is usual." />}
      {canEdit && (
        <div className="mt-3 flex justify-end gap-2">
          <Button disabled={!dirty} onClick={() => setValues(saved)}>
            Discard
          </Button>
          <Button type="primary" disabled={!dirty} loading={saving} onClick={save}>
            Save
          </Button>
        </div>
      )}
    </Card>
  );
}
