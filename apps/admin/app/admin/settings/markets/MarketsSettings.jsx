"use client";

import { useState } from "react";
import { Card, Checkbox, Switch, InputNumber, Button, Alert, App, Radio } from "antd";
import { FixedPrices } from "./FixedPrices";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@shopcycle/utils";

const NAMES = { INR: "Indian rupee", USD: "US dollar", EUR: "Euro", GBP: "British pound", JPY: "Japanese yen", CNY: "Chinese yuan", SAR: "Saudi riyal" };

/** Settings ▸ Markets and currencies (API: GET /api/store/markets, PATCH /api/store settings.markets). */
export function MarketsSettings({ initial, canEdit }) {
  const { message } = App.useApp();
  const [currencies, setCurrencies] = useState(initial.currencies || []);
  const [autoDetect, setAutoDetect] = useState(initial.autoDetect !== false);
  const [buffer, setBuffer] = useState(initial.buffer || 0);
  const [rounding, setRounding] = useState(initial.rounding || "none");
  const [saving, setSaving] = useState(false);
  const base = initial.base;
  const sample = base === "JPY" ? 10000 : base === "INR" ? 1000 : 100;

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/api/store", { method: "PATCH", body: { settings: { markets: { currencies, autoDetect, buffer: Number(buffer) || 0, rounding } } } });
      message.success(currencies.length ? "Currencies saved" : "Shoppers see prices in your store's currency only");
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {!initial.ratesDate && (
        <Alert
          type="info"
          showIcon
          message="Exchange rates haven't loaded yet"
          description={`They load within a few hours. Until then shoppers see prices in ${base}.`}
        />
      )}
      <Card size="small" styles={{ body: { padding: 24 } }}>
        <h3 className="m-0 text-[15px] font-medium text-ink">Currencies shoppers can choose</h3>
        <p className="m-0 mt-1 text-[13px] text-ink-muted">
          A currency menu appears on your store. Prices are converted from {base} at today&apos;s exchange rate.
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          {initial.options.map((o) => (
            <label key={o.code} className="flex items-center justify-between gap-3 rounded-lg border border-app-border px-3 py-2.5">
              <span className="flex items-center gap-2.5">
                <Checkbox
                  checked={currencies.includes(o.code)}
                  disabled={!canEdit || !o.rate}
                  onChange={(e) => setCurrencies((list) => (e.target.checked ? [...list, o.code] : list.filter((c) => c !== o.code)))}
                />
                <span className="text-[14px] text-ink">
                  {o.code} <span className="text-ink-muted">· {NAMES[o.code]}</span>
                </span>
              </span>
              <span className="text-[12.5px] text-ink-muted">
                {o.rate ? `${formatCurrency(sample, base)} ≈ ${formatCurrency(sample * o.rate * (1 + (Number(buffer) || 0) / 100), o.code)}` : "Rate not available yet"}
              </span>
            </label>
          ))}
        </div>
      </Card>

      <Card size="small" styles={{ body: { padding: 24 } }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[14px] font-medium text-ink">Show each visitor their own currency</div>
            <p className="m-0 mt-1 text-[13px] text-ink-muted">A shopper in Germany sees euros straight away, if you&apos;ve added euros. They can still switch.</p>
          </div>
          <Switch checked={autoDetect} onChange={setAutoDetect} disabled={!canEdit} />
        </div>
        <div className="mt-5">
          <div className="mb-1 text-[13px] font-medium text-ink">Conversion buffer (%)</div>
          <InputNumber min={0} max={10} step={0.5} value={buffer} onChange={setBuffer} disabled={!canEdit} className="!w-32" />
          <p className="m-0 mt-1 text-[12.5px] text-ink-muted">Added to the exchange rate to cover your card provider&apos;s conversion fee. Most stores use 0 to 3.</p>
        </div>
        <div className="mt-5">
          <div className="mb-1.5 text-[13px] font-medium text-ink">Converted prices</div>
          <Radio.Group
            value={rounding}
            onChange={(e) => setRounding(e.target.value)}
            disabled={!canEdit}
            options={[
              { value: "none", label: "Exact (11.14)" },
              { value: "99", label: "Round up to .99 (11.99)" },
              { value: "whole", label: "Whole numbers (11)" },
            ]}
          />
          <p className="m-0 mt-1 text-[12.5px] text-ink-muted">Yen always uses whole numbers. A fixed price below always wins.</p>
        </div>
      </Card>

      <p className="m-0 text-[12.5px] text-ink-muted">
        {initial.ratesDate ? `Exchange rates: ${initial.source || "European Central Bank"}, ${initial.ratesDate}. ` : ""}
        With Stripe or PayPal connected, shoppers pay in their own currency; otherwise checkout is in {base} and shows about how much that is.
      </p>

      {canEdit && (
        <div>
          <Button type="primary" loading={saving} onClick={save}>
            Save
          </Button>
        </div>
      )}

      <FixedPrices base={base} currencies={(initial.currencies || []).filter((c) => currencies.includes(c))} canEdit={canEdit} />
    </div>
  );
}
