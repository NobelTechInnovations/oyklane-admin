"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Alert, App, Button, Card, Select, Skeleton, Tabs } from "antd";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";

const money = (n) => (n == null ? "—" : Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const pct = (n) => (n == null ? "—" : `${Number(n).toFixed(2)}`);

// The rows of each block, as on a courier's own rate card.
const BLOCKS = [
  [
    ["fwd05", "FWD (0.50 KG)"],
    ["fwdAdd05", "FWD Additional (0.50 KG)"],
    ["cod", "COD"],
    ["codPct", "COD %", pct],
    ["rto05", "RTO (0.50 KG)"],
    ["rtoAdd05", "RTO Additional (0.50 KG)"],
  ],
  [
    ["fwd2", "FWD (2.00 KG)"],
    ["fwdAdd1", "FWD Additional (1.00 KG)"],
  ],
];

function RateTable({ courier, zones, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-app-border">
      <table className="w-full min-w-[640px] border-collapse text-[13px]">
        <thead>
          <tr className="bg-app-bg">
            <th className="px-4 py-3 text-left font-medium text-ink-muted">Zone</th>
            {zones.map((z) => (
              <th key={z.key} className="px-3 py-3 text-right font-medium text-ink-muted">
                Zone {z.key}
                <span className="block text-[11px] font-normal">{z.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, label, fmt]) => (
            <tr key={key} className="border-t border-app-border">
              <td className="px-4 py-2.5 text-ink">{label}</td>
              {zones.map((z) => (
                <td key={z.key} className="px-3 py-2.5 text-right tabular-nums text-ink">
                  {(fmt || money)(courier.zones?.[z.key]?.[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Shipping ▸ Rate chart: each courier's rates from the pickup pincode,
 * Surface or Air, laid out like a courier's own rate card — forward and
 * additional weight, the COD charge and %, returns (RTO). What you pay
 * when you book, before GST (shipping is added to your plan bill). */
export default function ShippingRatesPage() {
  const { message } = App.useApp();
  const [card, setCard] = useState(null);
  const [error, setError] = useState(null);
  const [service, setService] = useState("surface");
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (refresh) => {
      setBusy(true);
      setError(null);
      try {
        setCard(await apiFetch(`/api/shipping/oyklane/rate-card${refresh ? "?refresh=1" : ""}`));
      } catch (err) {
        setError(err);
        if (refresh) message.error(err.message);
      } finally {
        setBusy(false);
      }
    },
    [message]
  );
  useEffect(() => {
    load(false);
  }, [load]);

  const reason = error?.details?.reason;
  const couriers = card?.modes?.[service] || [];
  const courier = couriers.find((c) => c.name === picked) || couriers[0];

  return (
    <div>
      <PageHeader
        title="Rate chart"
        subtitle={card ? `From ${card.city ? `${card.city} ` : ""}${card.pincode} · prices in ₹ before GST · updated ${new Date(card.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : "Each courier's rates from your pickup pincode to every zone."}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/shipping/calculator">
              <Button>Rate calculator</Button>
            </Link>
            <Button icon={<RefreshCw size={14} aria-hidden="true" />} onClick={() => load(true)} loading={busy && Boolean(card)} disabled={!card && !error}>
              Refresh
            </Button>
          </div>
        }
      />
      {error && !card ? (
        reason === "no_pickup" || reason === "pickup_pending" ? (
          <Alert type="info" showIcon message={error.message} description={reason === "no_pickup" ? <Link href="/admin/settings/shipping">Settings ▸ Shipping</Link> : null} />
        ) : (
          <Alert type="error" showIcon message={error.message} action={<Button size="small" onClick={() => load(false)}>Try again</Button>} />
        )
      ) : !card ? (
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      ) : (
        <Card styles={{ body: { padding: 0 } }}>
          <Tabs
            activeKey={service}
            onChange={(k) => (setService(k), setPicked(null))}
            className="!px-5"
            items={[
              { key: "surface", label: "Surface" },
              { key: "air", label: "Air" },
            ]}
          />
          {!couriers.length ? (
            <p className="m-0 px-5 pb-6 text-[13px] text-ink-muted">No {service} rates came back for your pincode. Try Refresh in a minute.</p>
          ) : (
            <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
              <nav aria-label="Couriers" className="hidden border-r border-app-border md:block">
                <ul className="m-0 list-none p-0">
                  {couriers.map((c) => {
                    const on = c.name === courier?.name;
                    return (
                      <li key={c.name}>
                        <button
                          type="button"
                          onClick={() => setPicked(c.name)}
                          className={`w-full cursor-pointer border-0 border-l-[3px] px-5 py-3 text-left text-[14px] ${on ? "border-accent bg-accent-soft font-semibold text-ink" : "border-transparent bg-transparent text-ink hover:bg-app-bg"}`}
                          aria-current={on ? "true" : undefined}
                        >
                          {c.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              <div className="min-w-0 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="m-0 text-[18px] font-semibold text-ink">{courier?.name}</h2>
                  <Select className="md:!hidden !w-56" value={courier?.name} onChange={setPicked} options={couriers.map((c) => ({ value: c.name, label: c.name }))} />
                </div>
                <div className="flex flex-col gap-5">
                  {BLOCKS.map((rows, i) => (
                    <RateTable key={i} courier={courier} zones={card.zones} rows={rows} />
                  ))}
                </div>
                <p className="m-0 mt-4 text-[12.5px] text-ink-muted">
                  Zone A within your city, B within your state, C metro cities, D rest of India, E north-east and J&K. COD is the higher of the flat charge and the % of the order value. Couriers charge the higher of the weight and the box size (L × W × H ÷ 5000). The exact price for an order is shown when you ship it — or try the{" "}
                  <Link href="/admin/shipping/calculator">rate calculator</Link>.
                </p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
