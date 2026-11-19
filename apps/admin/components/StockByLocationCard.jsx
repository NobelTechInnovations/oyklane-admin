"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { App, Button, Card, InputNumber, Table } from "antd";
import { apiFetch } from "@/lib/api";

/**
 * Product form ▸ Stock by location (Settings ▸ Locations). Only shown when
 * the store has more than one location; the total is their sum.
 */
export function StockByLocationCard({ productId }) {
  const { message } = App.useApp();
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    if (!productId) return;
    apiFetch(`/api/locations/products/${productId}`)
      .then((d) => (setData(d), setDraft(Object.fromEntries(d.variants.map((v) => [v.id, { ...v.byLocation }])))))
      .catch(() => setData(null));
  }, [productId]);
  if (!data || data.locations.length < 2) return null;

  async function save(v) {
    setBusy(v.id);
    try {
      const r = await apiFetch(`/api/locations/variants/${v.id}`, { method: "PUT", body: { byLocation: draft[v.id] } });
      setData({ ...data, variants: data.variants.map((x) => (x.id === v.id ? { ...x, byLocation: r.byLocation, total: Object.values(r.byLocation).reduce((n, q) => n + q, 0) } : x)) });
      message.success("Stock saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  const changed = (v) => data.locations.some((l) => Number(draft[v.id]?.[l.id] ?? 0) !== Number(v.byLocation[l.id] ?? 0));
  const columns = [
    { title: "Variant", dataIndex: "title", render: (t, v) => <span className="text-[13px]">{t === "Default" ? "Stock" : t}{v.sku && <span className="block text-[12px] text-ink-muted">{v.sku}</span>}</span> },
    ...data.locations.map((l) => ({
      title: l.isDefault ? `${l.name} (default)` : l.name,
      width: 140,
      render: (_, v) => <InputNumber size="small" min={0} className="!w-24" value={draft[v.id]?.[l.id] ?? 0} onChange={(q) => setDraft({ ...draft, [v.id]: { ...draft[v.id], [l.id]: q ?? 0 } })} aria-label={`${v.title} at ${l.name}`} />,
    })),
    { title: "Total", width: 80, align: "right", render: (_, v) => data.locations.reduce((n, l) => n + Number(draft[v.id]?.[l.id] ?? 0), 0) },
    { title: "", width: 80, align: "right", render: (_, v) => <Button size="small" type={changed(v) ? "primary" : "default"} disabled={!changed(v)} loading={busy === v.id} onClick={() => save(v)}>Save</Button> },
  ];
  return (
    <Card size="small" title="Stock by location" extra={<Link href="/admin/settings/locations" className="text-[12px]">Locations</Link>} styles={{ body: { padding: 0 } }}>
      <Table rowKey="id" size="small" pagination={false} columns={columns} dataSource={data.variants} scroll={{ x: 520 }} />
      <p className="m-0 px-3 py-2 text-[12px] text-ink-muted">Shoppers can buy the total. Each order ships from the first location that has everything.</p>
    </Card>
  );
}
