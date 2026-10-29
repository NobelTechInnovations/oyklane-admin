"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Alert, App, Button, Card, Segmented, Skeleton, Table } from "antd";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";

const inr = (n) => (n == null ? "—" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`);
const kg = (g) => (g >= 1000 ? `${g / 1000} kg` : `${g} g`);

/** Shipping ▸ Rates: what every courier costs from the pickup pincode to
 * each zone, for common weights, prepaid or COD — what you pay when you
 * book (shipping is added to your plan bill). */
export default function ShippingRatesPage() {
  const { message } = App.useApp();
  const [card, setCard] = useState(null);
  const [error, setError] = useState(null);
  const [weight, setWeight] = useState(500);
  const [mode, setMode] = useState("prepaid");
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
  return (
    <div>
      <PageHeader
        title="Shipping rates"
        subtitle={card ? `From ${card.city ? `${card.city} ` : ""}${card.pincode}, per parcel, before GST. Updated ${new Date(card.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}.` : "What every courier costs from your pickup pincode to each zone."}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {card && <Segmented value={mode} onChange={setMode} options={[{ label: "Prepaid", value: "prepaid" }, { label: "COD", value: "cod" }]} />}
            {card && <Segmented value={weight} onChange={setWeight} options={card.weights.map((w) => ({ label: kg(w), value: w }))} />}
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
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ) : (
        <Card size="small" styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="name"
            dataSource={card.couriers}
            size="small"
            pagination={false}
            scroll={{ x: 760 }}
            locale={{ emptyText: "No courier prices came back. Try Refresh in a minute." }}
            columns={[
              { title: "Courier", dataIndex: "name", fixed: "left", width: 200, render: (v) => <span className="font-medium">{v}</span> },
              ...card.zones.map((z) => ({
                title: (
                  <span>
                    Zone {z.key}
                    <span className="block text-[11px] font-normal text-ink-muted">{z.label}</span>
                  </span>
                ),
                key: z.key,
                align: "right",
                render: (_, c) => <span className="tabular-nums">{inr(c[mode]?.[weight]?.[z.key])}</span>,
              })),
            ]}
          />
          <p className="m-0 border-t border-app-border px-4 py-3 text-[12.5px] text-ink-muted">
            Zone A within your city, B within your state, C metro cities, D rest of India, E north-east and J&K. The exact price for an order is shown when you ship it, from its weight and pincode.
          </p>
        </Card>
      )}
    </div>
  );
}
