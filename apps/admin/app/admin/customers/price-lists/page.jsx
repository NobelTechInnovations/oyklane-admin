"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { App, Button, Card, Drawer, Input, InputNumber, Popconfirm, Select, Switch, Table, Tag } from "antd";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { formatCurrency } from "@/lib/money";
import { apiFetch } from "@/lib/api";

const NEW = { name: "", discountPct: 0, minOrder: null, active: true, items: [] };

/** Customers ▸ Price lists: business prices for approved business accounts. */
export default function PriceListsPage() {
  const { message } = App.useApp();
  const [lists, setLists] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [names, setNames] = useState({});

  const load = useCallback(() => {
    apiFetch("/api/b2b/price-lists").then((d) => setLists(d.priceLists || [])).catch((err) => message.error(err.message));
  }, [message]);
  useEffect(load, [load]);

  async function save() {
    setBusy(true);
    try {
      await apiFetch(edit.id ? `/api/b2b/price-lists/${edit.id}` : "/api/b2b/price-lists", { method: edit.id ? "PATCH" : "POST", body: edit });
      message.success("Price list saved");
      setEdit(null);
      load();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id) {
    try {
      await apiFetch(`/api/b2b/price-lists/${id}`, { method: "DELETE" });
      message.success("Price list removed. Its buyers get store prices.");
      load();
    } catch (err) {
      message.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Price lists"
        subtitle="Business prices for approved business accounts: a % off everything, your own price per product, quantity breaks and a minimum order."
        backHref="/admin/customers/business"
        actions={
          <Button type="primary" icon={<Plus size={14} />} onClick={() => setEdit({ ...NEW })}>
            New price list
          </Button>
        }
      />
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          size="middle"
          loading={!lists}
          dataSource={lists || []}
          pagination={false}
          locale={{ emptyText: "No price lists yet. Create one, then pick it when you approve a business account." }}
          columns={[
            { title: "Name", dataIndex: "name", render: (n, l) => <span className="font-medium">{n} {!l.active && <Tag>Off</Tag>}</span> },
            { title: "Off everything", dataIndex: "discountPct", width: 130, render: (p) => (p > 0 ? `${p}%` : "—") },
            { title: "Own prices", width: 110, render: (_, l) => l.items.length || "—" },
            { title: "Minimum order", dataIndex: "minOrder", width: 140, render: (m) => (m ? formatCurrency(m) : "—") },
            { title: "Buyers", dataIndex: "buyers", width: 90 },
            {
              title: "",
              width: 160,
              align: "right",
              render: (_, l) => (
                <span className="inline-flex gap-1">
                  <Button size="small" onClick={() => setEdit({ ...l })}>
                    Edit
                  </Button>
                  <Popconfirm title={`Remove ${l.name}?`} description="Buyers on it get store prices." okText="Remove" okButtonProps={{ danger: true }} onConfirm={() => remove(l.id)}>
                    <Button size="small" type="text" danger>
                      Remove
                    </Button>
                  </Popconfirm>
                </span>
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        open={Boolean(edit)}
        width={720}
        title={edit?.id ? `Edit ${edit.name}` : "New price list"}
        onClose={() => setEdit(null)}
        extra={
          <Button type="primary" loading={busy} onClick={save}>
            Save price list
          </Button>
        }
      >
        {edit && <Editor edit={edit} setEdit={setEdit} names={names} setNames={setNames} />}
      </Drawer>
    </div>
  );
}

function Editor({ edit, setEdit, names, setNames }) {
  const [options, setOptions] = useState([]);
  const timer = useRef(null);
  const search = (q) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const d = await apiFetch(`/api/products?q=${encodeURIComponent(q || "")}&pageSize=20`).catch(() => ({}));
      const opts = (d.products || []).flatMap((p) => (p.variants || []).map((v) => ({ value: v.id, label: `${p.title}${v.title && v.title !== "Default" ? ` — ${v.title}` : ""}`, price: Number(v.price) })));
      setOptions(opts);
      setNames((n) => ({ ...n, ...Object.fromEntries(opts.map((o) => [o.value, { label: o.label, price: o.price }])) }));
    }, 250);
  };
  const setItem = (i, patch) => setEdit({ ...edit, items: edit.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const add = (variantId) => !edit.items.some((i) => i.variantId === variantId) && setEdit({ ...edit, items: [...edit.items, { variantId, price: null, breaks: [] }] });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <label>
          <span className="mb-1 block text-[12px] text-ink-muted">Name</span>
          <Input value={edit.name} maxLength={80} placeholder="e.g. Wholesale, Distributors" onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
        </label>
        <label>
          <span className="mb-1 block text-[12px] text-ink-muted">% off everything else</span>
          <InputNumber className="!w-full" min={0} max={90} value={edit.discountPct} addonAfter="%" onChange={(discountPct) => setEdit({ ...edit, discountPct: discountPct ?? 0 })} />
        </label>
        <label>
          <span className="mb-1 block text-[12px] text-ink-muted">Minimum order</span>
          <InputNumber className="!w-full" min={0} value={edit.minOrder} placeholder="None" onChange={(minOrder) => setEdit({ ...edit, minOrder })} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-[13px]">
        <Switch size="small" checked={edit.active} onChange={(active) => setEdit({ ...edit, active })} /> In use
      </label>

      <div>
        <p className="m-0 text-[13px] font-medium">Your own prices</p>
        <p className="m-0 mb-2 text-[12px] text-ink-muted">A price for a product, and lower prices from a quantity (e.g. 10 or more). Products not listed get the % off above.</p>
        <Select showSearch filterOption={false} onSearch={search} onFocus={() => !options.length && search("")} value={null} placeholder="Add a product" options={options} onChange={add} className="!w-full" />
        <div className="mt-3 flex flex-col gap-2">
          {edit.items.map((it, i) => (
            <div key={it.variantId} className="rounded-lg border border-line p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-medium">
                  {names[it.variantId]?.label || it.label || "Product"}
                  {(names[it.variantId]?.price ?? it.basePrice) != null && <span className="ml-1 font-normal text-ink-muted">· store price {formatCurrency(names[it.variantId]?.price ?? it.basePrice)}</span>}
                </span>
                <Button size="small" type="text" danger icon={<Trash2 size={14} />} aria-label="Remove product" onClick={() => setEdit({ ...edit, items: edit.items.filter((_, j) => j !== i) })} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
                <span>Price</span>
                <InputNumber size="small" min={0} value={it.price} placeholder="% off" onChange={(price) => setItem(i, { price })} className="!w-28" />
                {(it.breaks || []).map((b, k) => (
                  <span key={k} className="inline-flex items-center gap-1">
                    <span className="text-ink-muted">·</span>
                    <InputNumber size="small" min={2} value={b.minQty} onChange={(minQty) => setItem(i, { breaks: it.breaks.map((x, y) => (y === k ? { ...x, minQty } : x)) })} className="!w-16" aria-label="From quantity" />
                    <span>or more:</span>
                    <InputNumber size="small" min={0} value={b.price} onChange={(price) => setItem(i, { breaks: it.breaks.map((x, y) => (y === k ? { ...x, price } : x)) })} className="!w-24" aria-label="Price" />
                    <Button size="small" type="text" onClick={() => setItem(i, { breaks: it.breaks.filter((_, y) => y !== k) })} aria-label="Remove break">
                      ×
                    </Button>
                  </span>
                ))}
                {(it.breaks || []).length < 5 && (
                  <Button size="small" type="link" onClick={() => setItem(i, { breaks: [...(it.breaks || []), { minQty: 10, price: it.price || names[it.variantId]?.price || 0 }] })}>
                    Add quantity break
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="m-0 text-[12px] text-ink-muted">
        Give it to buyers in <Link href="/admin/customers/business">Business accounts</Link>.
      </p>
    </div>
  );
}
