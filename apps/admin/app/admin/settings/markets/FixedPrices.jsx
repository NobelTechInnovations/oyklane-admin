"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Table, InputNumber, Button, Input, App, Empty } from "antd";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@shopcycle/utils";

/**
 * Settings ▸ Markets ▸ Fixed prices: a product's exact price in another
 * currency (e.g. 12.99 €), instead of today's conversion. Empty = converted.
 * Only the currencies the store has saved in Markets show here.
 */
export function FixedPrices({ base, currencies, canEdit }) {
  const { message } = App.useApp();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [edits, setEdits] = useState({}); // variantId → { EUR: 12.99 }
  const [saving, setSaving] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch(`/api/store/markets/prices?q=${encodeURIComponent(q)}&page=${page}`));
    } catch (err) {
      message.error(err.message);
    }
  }, [q, page, message]);
  useEffect(() => {
    if (currencies.length) load();
  }, [load, currencies.length]);

  async function save(row) {
    setSaving(row.id);
    try {
      const prices = { ...row.prices, ...edits[row.id] };
      const saved = await apiFetch(`/api/store/markets/prices/${row.id}`, { method: "PUT", body: { prices } });
      setData((d) => ({ ...d, variants: d.variants.map((v) => (v.id === row.id ? { ...v, prices: saved.prices } : v)) }));
      setEdits(({ [row.id]: _, ...rest }) => rest);
      message.success("Prices saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(null);
    }
  }

  if (!currencies.length) return null;
  return (
    <Card size="small" styles={{ body: { padding: 24 } }}>
      <h3 className="m-0 text-[15px] font-medium text-ink">Fixed prices</h3>
      <p className="m-0 mt-1 text-[13px] text-ink-muted">
        Set a product&apos;s exact price in a currency, like 12.99 €. Leave it empty to use today&apos;s converted price.
      </p>
      <Input.Search className="mt-4 max-w-sm" placeholder="Search products" allowClear onSearch={(v) => (setPage(1), setQ(v))} />
      <Table
        className="mt-3"
        size="small"
        rowKey="id"
        loading={!data}
        dataSource={data?.variants || []}
        locale={{ emptyText: <Empty description="No products" /> }}
        scroll={{ x: 520 }}
        pagination={{ current: page, pageSize: 50, total: data?.total || 0, onChange: setPage, size: "small", showSizeChanger: false }}
        columns={[
          {
            title: "Product",
            key: "product",
            render: (_, r) => (
              <div className="min-w-[160px]">
                <div className="text-ink">{r.product}</div>
                <div className="text-[12px] text-ink-muted">
                  {r.title ? `${r.title} · ` : ""}
                  {formatCurrency(r.price, base)}
                </div>
              </div>
            ),
          },
          ...currencies.map((c) => ({
            title: c,
            key: c,
            width: 130,
            render: (_, r) => (
              <InputNumber
                size="small"
                min={0}
                step={c === "JPY" ? 1 : 0.01}
                precision={c === "JPY" ? 0 : 2}
                placeholder="Converted"
                disabled={!canEdit}
                value={edits[r.id]?.[c] !== undefined ? edits[r.id][c] : r.prices?.[c] ?? null}
                onChange={(v) => setEdits((e) => ({ ...e, [r.id]: { ...e[r.id], [c]: v } }))}
                className="!w-full"
              />
            ),
          })),
          {
            title: "",
            key: "save",
            width: 80,
            align: "right",
            render: (_, r) =>
              edits[r.id] ? (
                <Button size="small" type="primary" loading={saving === r.id} onClick={() => save(r)}>
                  Save
                </Button>
              ) : null,
          },
        ]}
      />
    </Card>
  );
}
