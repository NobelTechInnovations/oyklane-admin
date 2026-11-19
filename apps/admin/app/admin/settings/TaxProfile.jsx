"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, Input, Tag } from "antd";
import { API_URL, apiFetch } from "@/lib/api";

const SYSTEM = { gst: "GST", vat: "VAT", sales_tax: "Sales tax by state", consumption: "Consumption tax" };

/** Settings ▸ Taxes: what the store's home country decides (lib/country-rules.js). Hidden for India. */
export function TaxProfile() {
  const { message } = App.useApp();
  const [p, setP] = useState(null);
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [range, setRange] = useState({ from: "", to: "" });
  useEffect(() => {
    apiFetch("/api/taxes/profile")
      .then((d) => (setP(d), setNumber(d.number || "")))
      .catch(() => {});
  }, []);
  if (!p || p.country === "IN") return null;

  async function save() {
    setBusy(true);
    try {
      const d = await apiFetch("/api/taxes/profile", { method: "PUT", body: { number } });
      setP(d);
      message.success("Saved. It shows on your invoices.");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  const qs = new URLSearchParams({ format: "csv", ...(range.from && { from: range.from }), ...(range.to && { to: range.to }) });
  return (
    <Card size="small" className="!mb-5" title={`Tax rules for ${p.country}`}>
      <div className="flex flex-col gap-3 text-[13px]">
        <div className="flex flex-wrap gap-1.5">
          <Tag>{SYSTEM[p.tax] || p.label}</Tag>
          <Tag>{p.inclusive ? `Prices include ${p.label}` : `${p.label} added at checkout`}</Tag>
          {p.standard > 0 && <Tag>Standard {p.standard}%</Tag>}
          {p.reduced > 0 && <Tag>Reduced {p.reduced}%</Tag>}
        </div>
        <p className="m-0 text-ink-muted">
          {p.byRegion
            ? "Add a rate per state below (state code like CA, or its name). Orders get the rate of the delivery state; a rate without a state is used for the rest."
            : `Your rate below is the standard one. Give a product its own rate (for example the reduced ${p.reduced || ""}%) on its page.`}
        </p>
        <label>
          <span className="mb-1 block text-[12px] text-ink-muted">{p.regLabel} (on your invoices)</span>
          <div className="flex gap-2">
            <Input value={number} maxLength={40} onChange={(e) => setNumber(e.target.value)} className="!max-w-sm" />
            <Button onClick={save} loading={busy}>
              Save
            </Button>
          </div>
        </label>
        {p.eu && (
          <div className="border-t border-line pt-3">
            <p className="m-0 font-medium">EU One-Stop Shop (OSS)</p>
            <p className="m-0 mb-2 text-ink-muted">Sales and VAT to buyers in other EU countries, for your OSS return. Leave the dates empty for this quarter.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Input type="date" className="!w-40" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} aria-label="From" />
              <span>to</span>
              <Input type="date" className="!w-40" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} aria-label="To" />
              <a href={`${API_URL}/api/taxes/oss?${qs}`} target="_blank" rel="noreferrer">
                <Button>Download CSV</Button>
              </a>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
