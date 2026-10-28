"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Alert, App, Button, Card, Segmented, Skeleton, Table, Tooltip } from "antd";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";

const inr = (n) => (n == null ? "—" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`);
const kg = (g) => (g >= 1000 ? `${g / 1000} kg` : `${g} g`);

/** Orders ▸ Shipping rates: what every courier costs from your pickup
 * pincode to each zone, for common parcel weights — what you pay when you
 * book (courier charges are added to your plan bill). */
export default function ShippingRatesPage() {
  const { message } = App.useApp();
  const [card, setCard] = useState(null);
  const [error, setError] = useState(null);
  const [weight, setWeight] = useState(500);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (refresh) => {
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
  }, [message]);
  useEffect(() => {
    load(false);
  }, [load]);

  const zones = card?.zones || [];
  return (
    <div>
      <PageHeader
        title="Shipping rates"
        subtitle={card ? `Courier prices from ${card.city ? `${card.city} ` : ""}${card.pincode}, per parcel, before GST. Updated ${new Date(card.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}.` : "Courier prices from your pickup pincode to every zone."}
        actions={
          <div className="flex items-center gap-2">
            {card && <Segmented value={weight} onChange={setWeight} options={card.weights.map((w) => ({ label: kg(w), value: w }))} />}
            <Button icon={<RefreshCw size={14} aria-hidden="true" />} onClick={() => load(true)} loading={busy && Boolean(card)} disabled={!card && !error}>
              Refresh
            </Button>
          </div>
        }
      />
      {error && !card ? (
        (error.details?.reason || error.reason) === "no_pickup" ? (
          <Alert type="info" showIcon message="Add your pickup address first" description={<span>Prices are worked out from your pickup pincode. <Link href="/admin/settings/shipping">Settings ▸ Shipping</Link></span>} />
        ) : (
          <Alert type="error" showIcon message={error.message} action={<Button size="small" onClick={() => load(false)}>Try again</Button>} />
        )
      ) : !card ? (
        <Card>
          <Skeleton active paragraph={{ rows: 6 }} />
          <p className="m-0 mt-2 text-[12.5px] text-ink-muted">Asking every courier for prices — this takes a few seconds the first time.</p>
        </Card>
      ) : (
        <Card size="small" styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="courierId"
            dataSource={card.couriers}
            size="small"
            pagination={false}
            scroll={{ x: 760 }}
            locale={{ emptyText: "No courier prices came back. Try Refresh in a minute." }}
            columns={[
              { title: "Courier", dataIndex: "name", fixed: "left", width: 200, render: (v) => <span className="font-medium">{v}</span> },
              ...zones.map((z) => ({
                title: (
                  <Tooltip title={`Sample: ${z.city} ${z.pincode}`}>
                    <span>
                      {z.key} · {z.label}
                      <span className="block text-[11px] font-normal text-ink-muted">{z.city}</span>
                    </span>
                  </Tooltip>
                ),
                key: z.key,
                align: "right",
                render: (_, c) => (
                  <span className="tabular-nums">
                    {inr(c.prices[z.key]?.[weight])}
                    {c.eta?.[z.key] != null && <span className="block text-[11px] text-ink-muted">{typeof c.eta[z.key] === "number" || /^\d+$/.test(String(c.eta[z.key])) ? `${c.eta[z.key]} days` : String(c.eta[z.key])}</span>}
                  </span>
                ),
              })),
              { title: "COD charge", key: "cod", align: "right", render: (_, c) => inr(c.cod?.A ?? Object.values(c.cod || {})[0]) },
            ]}
          />
          <p className="m-0 px-4 py-3 text-[12.5px] text-ink-muted border-t border-app-border">
            Zones: A within your city, B within your state, C metro cities, D rest of India, E north-east and J&K. The exact price for an order is shown when you ship it, from its weight and pincode. COD orders also pay the COD charge.
          </p>
        </Card>
      )}
    </div>
  );
}
