"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { App, Button, Card, Checkbox, Drawer, Dropdown, Input, InputNumber, Modal, Pagination, Radio, Select, Switch, Table, Tabs, Tag } from "antd";
import { MoreHorizontal, Plus, RefreshCw, Upload } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { formatCurrency } from "@/lib/money";
import { apiFetch, apiDownload } from "@/lib/api";

const NEW = { name: "", email: "", whatsapp: "", feedUrl: "", markupPct: 50, rounding: "whole", sendBy: "email", autoSend: true, note: "" };
const SEND_BY = { email: "Email", whatsapp: "WhatsApp", csv: "CSV sheet" };
const ROUNDING = [
  { value: "whole", label: "Round up to a whole number (449)" },
  { value: "99", label: "End in .99 (448.99)" },
  { value: "none", label: "Exact (448.50)" },
];

function priceFrom(cost, s) {
  const raw = Number(cost || 0) * (1 + Number(s.markupPct || 0) / 100);
  if (s.rounding === "99") return Math.max(0.99, Math.ceil(raw) - 0.01);
  if (s.rounding === "whole") return Math.ceil(raw);
  return Math.round(raw * 100) / 100;
}

const TABS = ["suppliers", "find", "sell", "payments"];

/** Products ▸ Suppliers: dropshipping, from your own suppliers or other Oyklane stores, and selling to them. */
export default function SuppliersPage() {
  const [tab, setTab] = useState("suppliers");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (TABS.includes(t)) setTab(t);
  }, []);
  const change = (t) => {
    setTab(t);
    window.history.replaceState(null, "", t === "suppliers" ? window.location.pathname : `?tab=${t}`);
  };
  return (
    <div>
      <PageHeader title="Suppliers" subtitle="Sell products without holding stock: each order goes to the supplier to ship, and their tracking reaches your buyer. Or sell your own products through other Oyklane stores." backHref="/admin/products" />
      <Tabs
        activeKey={tab}
        onChange={change}
        destroyOnHidden
        items={[
          { key: "suppliers", label: "Your suppliers", children: <YourSuppliers onFind={() => change("find")} /> },
          { key: "find", label: "Find products", children: <FindProducts /> },
          { key: "sell", label: "Sell to other stores", children: <SellToStores /> },
          { key: "payments", label: "Payments", children: <Payments /> },
        ]}
      />
    </div>
  );
}

function YourSuppliers({ onFind }) {
  const { message, modal } = App.useApp();
  const [suppliers, setSuppliers] = useState(null);
  const [products, setProducts] = useState(null);
  const [filter, setFilter] = useState(null);
  const [edit, setEdit] = useState(null);
  const [importFor, setImportFor] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiFetch("/api/dropship/suppliers").then((d) => setSuppliers(d.suppliers)).catch((err) => message.error(err.message));
    apiFetch(`/api/dropship/products${filter ? `?supplierId=${filter}` : ""}`).then((d) => setProducts(d.products)).catch(() => setProducts([]));
  }, [message, filter]);
  useEffect(load, [load]);

  async function save() {
    setBusy(true);
    try {
      await apiFetch(edit.id ? `/api/dropship/suppliers/${edit.id}` : "/api/dropship/suppliers", { method: edit.id ? "PATCH" : "POST", body: edit });
      setEdit(null);
      message.success("Supplier saved");
      load();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function reprice(s) {
    try {
      const r = await apiFetch(`/api/dropship/suppliers/${s.id}/prices`, { method: "POST" });
      message.success(`${r.updated} price${r.updated === 1 ? "" : "s"} updated`);
      load();
    } catch (err) {
      message.error(err.message);
    }
  }
  async function sync(s) {
    try {
      const r = await apiFetch(`/api/dropship/suppliers/${s.id}/sync`, { method: "POST" });
      message.success(r.changed ? `Synced: ${r.changed} change${r.changed === 1 ? "" : "s"}` : "Already up to date");
      load();
    } catch (err) {
      message.error(err.message);
    }
  }
  async function remove(s) {
    try {
      await apiFetch(`/api/dropship/suppliers/${s.id}`, { method: "DELETE" });
      message.success("Supplier removed. Their products stay in your store.");
      if (filter === s.id) setFilter(null);
      load();
    } catch (err) {
      message.error(err.message);
    }
  }

  const columns = [
    {
      title: "Supplier",
      render: (_, s) => (
        <div className="text-[13px]">
          <span className="font-medium text-ink">{s.name}</span> {s.network && <Tag className="!ml-1">Oyklane store</Tag>}
          <span className="block text-ink-muted">{s.network ? "Stock and cost follow their store" : [s.email, s.whatsapp].filter(Boolean).join(", ") || "No contact yet"}</span>
        </div>
      ),
    },
    {
      title: "Orders go by",
      width: 150,
      render: (_, s) => (
        <span className="text-[13px]">
          {s.network ? "Their dashboard" : SEND_BY[s.sendBy]} {s.sendBy === "email" && !s.autoSend && <Tag className="!ml-1">You send</Tag>}
        </span>
      ),
    },
    { title: "Markup", dataIndex: "markupPct", width: 90, align: "right", render: (m) => `${Number(m)}%` },
    { title: "Products", dataIndex: "products", width: 90, align: "right" },
    { title: "To ship", dataIndex: "openOrders", width: 80, align: "right", render: (n) => (n ? <Tag color="orange">{n}</Tag> : 0) },
    { title: "Last update", dataIndex: "lastSyncAt", width: 130, render: (d) => (d ? new Date(d).toLocaleDateString([], { day: "numeric", month: "short" }) : "—") },
    {
      title: "",
      width: 170,
      align: "right",
      render: (_, s) => (
        <span className="inline-flex gap-1">
          {s.network ? (
            <Button size="small" icon={<RefreshCw size={13} />} onClick={() => sync(s)}>
              Sync now
            </Button>
          ) : (
            <Button size="small" icon={<Upload size={13} />} onClick={() => setImportFor(s)}>
              Import
            </Button>
          )}
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "edit", label: "Edit", onClick: () => setEdit({ ...NEW, ...s, email: s.email || "", whatsapp: s.whatsapp || "", feedUrl: s.feedUrl || "", note: s.note || "" }) },
                { key: "price", label: "Apply markup to all prices", onClick: () => reprice(s) },
                !s.network && { key: "csv", label: "Download orders to ship (CSV)", onClick: () => apiDownload(`/api/dropship/suppliers/${s.id}/orders.csv`, "supplier-orders.csv").catch((err) => message.error(err.message)) },
                { type: "divider" },
                { key: "remove", danger: true, label: "Remove", onClick: () => modal.confirm({ title: `Remove ${s.name}?`, content: s.network ? "Their products stay in your store as your own, but new orders won't go to them and stock stops following theirs." : "Their products stay in your store as your own.", okText: "Remove", okButtonProps: { danger: true }, onOk: () => remove(s) }) },
              ].filter(Boolean),
            }}
          >
            <Button size="small" icon={<MoreHorizontal size={14} />} aria-label="More actions" />
          </Dropdown>
        </span>
      ),
    },
  ];

  const productColumns = [
    { title: "Supplier SKU", dataIndex: "supplierSku", width: 140 },
    {
      title: "Product",
      render: (_, p) => (
        <span className="text-[13px]">
          <Link href={`/admin/products/${p.productId}`} className="text-ink hover:underline">
            {p.title}
          </Link>{" "}
          {p.status === "draft" && <Tag className="!ml-1">Draft</Tag>}
        </span>
      ),
    },
    { title: "Stock", dataIndex: "stock", width: 80, align: "right" },
    { title: "Cost", dataIndex: "cost", width: 110, align: "right", render: (v) => formatCurrency(v) },
    { title: "Your price", dataIndex: "price", width: 110, align: "right", render: (v) => formatCurrency(v) },
    { title: "Margin", dataIndex: "margin", width: 90, align: "right", render: (m) => <span className={m < 15 ? "text-red-600" : ""}>{m}%</span> },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-ink-muted">Your own suppliers: import their list from a CSV file or feed link with your markup. Suppliers on Oyklane are added when you add their products.</p>
        <span className="inline-flex gap-2">
          <Button onClick={onFind}>Find products on Oyklane</Button>
          <Button type="primary" icon={<Plus size={14} />} onClick={() => setEdit({ ...NEW })}>
            Add supplier
          </Button>
        </span>
      </div>
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table rowKey="id" size="middle" loading={!suppliers} columns={columns} dataSource={suppliers || []} pagination={false} scroll={{ x: 860 }} locale={{ emptyText: "No suppliers yet. Add one, or find products other Oyklane stores sell." }} />
      </Card>

      {(suppliers?.length || 0) > 0 && (
        <Card
          size="small"
          title="Supplier products"
          className="mt-6"
          extra={<Select size="small" allowClear placeholder="All suppliers" value={filter} onChange={(v) => setFilter(v || null)} options={(suppliers || []).map((s) => ({ value: s.id, label: s.name }))} className="!w-48" />}
          styles={{ body: { padding: 0 } }}
        >
          <Table rowKey="id" size="small" loading={!products} columns={productColumns} dataSource={products || []} pagination={{ pageSize: 25, hideOnSinglePage: true }} scroll={{ x: 760 }} locale={{ emptyText: "No products imported yet" }} />
        </Card>
      )}

      <Modal open={Boolean(edit)} title={edit?.id ? "Edit supplier" : "Add supplier"} okText="Save supplier" okButtonProps={{ loading: busy }} onCancel={() => setEdit(null)} onOk={save} width={560}>
        {edit && (edit.network ? <NetworkSupplierForm value={edit} onChange={setEdit} /> : <SupplierForm value={edit} onChange={setEdit} />)}
      </Modal>
      {importFor && <ImportModal supplier={importFor} onClose={() => setImportFor(null)} onDone={load} />}
    </div>
  );
}

function SupplierForm({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="mb-1 block text-[12px] text-ink-muted">Name</span>
        <Input value={s.name} maxLength={120} placeholder="e.g. Jaipur Brass Works" onChange={(e) => set({ name: e.target.value })} />
      </label>
      <label>
        <span className="mb-1 block text-[12px] text-ink-muted">Email for orders</span>
        <Input type="email" value={s.email} onChange={(e) => set({ email: e.target.value })} />
      </label>
      <label>
        <span className="mb-1 block text-[12px] text-ink-muted">WhatsApp number</span>
        <Input value={s.whatsapp} placeholder="With country code" onChange={(e) => set({ whatsapp: e.target.value })} />
      </label>
      <label>
        <span className="mb-1 block text-[12px] text-ink-muted">Send each order by</span>
        <Select className="!w-full" value={s.sendBy} onChange={(sendBy) => set({ sendBy })} options={Object.entries(SEND_BY).map(([value, label]) => ({ value, label }))} />
      </label>
      {s.sendBy === "email" ? (
        <label className="flex items-center gap-2 pt-5 text-[13px]">
          <Switch size="small" checked={s.autoSend} onChange={(autoSend) => set({ autoSend })} />
          Email each order as it's placed
        </label>
      ) : (
        <p className="pt-5 text-[12px] text-ink-muted">{s.sendBy === "whatsapp" ? "Send from the order page in one tap." : "Download open orders here as one sheet."}</p>
      )}
      <label>
        <span className="mb-1 block text-[12px] text-ink-muted">Markup on cost (%)</span>
        <InputNumber className="!w-full" min={0} max={1000} value={s.markupPct} onChange={(markupPct) => set({ markupPct: markupPct ?? 0 })} />
      </label>
      <label>
        <span className="mb-1 block text-[12px] text-ink-muted">Rounding</span>
        <Select className="!w-full" value={s.rounding} onChange={(rounding) => set({ rounding })} options={ROUNDING} />
      </label>
      <p className="sm:col-span-2 text-[12px] text-ink-muted">A product costing {formatCurrency(299)} sells for {formatCurrency(priceFrom(299, s))}.</p>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-[12px] text-ink-muted">Product feed link (optional)</span>
        <Input value={s.feedUrl} placeholder="https://… a CSV the supplier keeps updated" onChange={(e) => set({ feedUrl: e.target.value })} />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-[12px] text-ink-muted">Note (only you see it)</span>
        <Input.TextArea rows={2} maxLength={500} value={s.note} onChange={(e) => set({ note: e.target.value })} />
      </label>
    </div>
  );
}

function ImportModal({ supplier, onClose, onDone }) {
  const { message } = App.useApp();
  const [csv, setCsv] = useState(null);
  const [fileName, setFileName] = useState("");
  const [publish, setPublish] = useState(false);
  const [keepPrices, setKeepPrices] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const input = useRef(null);

  function pick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) return message.error("The file is over 15 MB. Split it into smaller files.");
    const reader = new FileReader();
    reader.onload = () => {
      setCsv(String(reader.result || ""));
      setFileName(file.name);
    };
    reader.readAsText(file);
  }
  async function run(fromFeed) {
    setBusy(true);
    try {
      const r = await apiFetch(`/api/dropship/suppliers/${supplier.id}/import`, { method: "POST", body: { ...(fromFeed ? { fromFeed: true } : { csv }), publish, keepPrices } });
      setResult(r);
      onDone();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open title={`Import products from ${supplier.name}`} onCancel={onClose} footer={result ? <Button onClick={onClose}>Done</Button> : null} width={560}>
      {result ? (
        <div className="text-[13px]">
          <p>
            {result.created} new product{result.created === 1 ? "" : "s"}, {result.updated} updated.
          </p>
          {result.skipped.length > 0 && (
            <div className="mt-2">
              <span className="font-medium">Skipped</span>
              <ul className="mt-1 list-disc pl-5 text-ink-muted">
                {result.skipped.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 text-[13px]">
          <p className="text-ink-muted">
            A CSV with a header row: <b>SKU</b>, <b>Title</b> and <b>Cost</b> are needed. Also read: Description, MRP, Stock, Image URL (or Image 1, Image 2…), HSN, GST. Importing again updates cost, stock and price for the same SKUs.
          </p>
          <div className="flex items-center gap-2">
            <input ref={input} type="file" accept=".csv,.tsv,text/csv" className="hidden" onChange={pick} />
            <Button icon={<Upload size={14} />} onClick={() => input.current?.click()}>
              Choose CSV file
            </Button>
            <span className="text-ink-muted">{fileName || "No file chosen"}</span>
          </div>
          <Checkbox checked={publish} onChange={(e) => setPublish(e.target.checked)}>
            Put new products on sale now (otherwise they're added as drafts to check first)
          </Checkbox>
          <Checkbox checked={keepPrices} onChange={(e) => setKeepPrices(e.target.checked)}>
            Keep my prices on products already imported (update cost and stock only)
          </Checkbox>
          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-3">
            {supplier.feedUrl && (
              <Button loading={busy} onClick={() => run(true)}>
                Import from feed link
              </Button>
            )}
            <Button type="primary" disabled={!csv} loading={busy} onClick={() => run(false)}>
              Import file
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function NetworkSupplierForm({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  return (
    <div className="grid grid-cols-1 gap-3">
      <label>
        <span className="mb-1 block text-[12px] text-ink-muted">Name (only you see it)</span>
        <Input value={s.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} />
      </label>
      <label>
        <span className="mb-1 block text-[12px] text-ink-muted">Markup on cost (%), for "Apply markup to all prices"</span>
        <InputNumber className="!w-full" min={0} max={1000} value={s.markupPct} onChange={(markupPct) => set({ markupPct: markupPct ?? 0 })} />
      </label>
      <label>
        <span className="mb-1 block text-[12px] text-ink-muted">Rounding</span>
        <Select className="!w-full" value={s.rounding} onChange={(rounding) => set({ rounding })} options={ROUNDING} />
      </label>
      <label>
        <span className="mb-1 block text-[12px] text-ink-muted">Note (only you see it)</span>
        <Input.TextArea rows={2} maxLength={500} value={s.note} onChange={(e) => set({ note: e.target.value })} />
      </label>
    </div>
  );
}

/** Products other Oyklane stores sell to you: add one in a click. */
function FindProducts() {
  const { message } = App.useApp();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [publish, setPublish] = useState(false);
  const [busy, setBusy] = useState(null);
  const load = useCallback(
    (query, pg) => {
      setData(null);
      apiFetch(`/api/dropship/network/catalog?q=${encodeURIComponent(query || "")}&page=${pg}`)
        .then(setData)
        .catch((err) => {
          message.error(err.message);
          setData({ products: [], total: 0, page: 1, pageSize: 24 });
        });
    },
    [message]
  );
  useEffect(() => load("", 1), [load]);

  async function add(p) {
    setBusy(p.id);
    try {
      const r = await apiFetch("/api/dropship/network/import", { method: "POST", body: { productId: p.id, publish } });
      message.success(r.already ? "It's already in your store" : publish ? "Added and on sale" : "Added as a draft. Check it, then put it on sale.");
      setData((d) => ({ ...d, products: d.products.map((x) => (x.id === p.id ? { ...x, importedProductId: r.productId } : x)) }));
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  const columns = [
    {
      title: "Product",
      render: (_, p) => (
        <div className="flex items-center gap-3 text-[13px]">
          {p.image ? <img src={p.image} alt="" className="h-12 w-12 shrink-0 rounded border border-line object-cover" /> : <span className="h-12 w-12 shrink-0 rounded border border-line bg-app-bg" />}
          <span>
            <span className="font-medium text-ink">{p.title}</span>
            <span className="block text-ink-muted">
              {p.supplier.name}, ships in {p.supplier.dispatchDays} day{p.supplier.dispatchDays === 1 ? "" : "s"}
              {p.variants > 1 ? `, ${p.variants} options` : ""}
            </span>
          </span>
        </div>
      ),
    },
    { title: "Your cost", dataIndex: "wholesale", width: 110, align: "right", render: (v) => formatCurrency(v) },
    { title: "Sells at", dataIndex: "price", width: 110, align: "right", render: (v) => formatCurrency(v) },
    { title: "Margin", dataIndex: "margin", width: 80, align: "right", render: (m) => `${m}%` },
    { title: "Packing and shipping", width: 150, align: "right", render: (_, p) => (p.supplier.shippingFee ? `${formatCurrency(p.supplier.shippingFee)} per order` : "Included") },
    { title: "Stock", dataIndex: "stock", width: 80, align: "right" },
    {
      title: "",
      width: 150,
      align: "right",
      render: (_, p) =>
        p.importedProductId ? (
          <Link href={`/admin/products/${p.importedProductId}`} className="text-[13px] hover:underline">
            In your store
          </Link>
        ) : (
          <Button size="small" type="primary" loading={busy === p.id} onClick={() => add(p)}>
            Add to my store
          </Button>
        ),
    },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Input.Search allowClear placeholder="Search products" className="!w-72" value={q} onChange={(e) => setQ(e.target.value)} onSearch={(v) => (setPage(1), load(v, 1))} />
        <Checkbox checked={publish} onChange={(e) => setPublish(e.target.checked)}>
          Put added products on sale now
        </Checkbox>
      </div>
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table rowKey="id" size="middle" loading={!data} columns={columns} dataSource={data?.products || []} pagination={false} scroll={{ x: 900 }} locale={{ emptyText: q ? "No products match your search." : "No other store sells to Oyklane stores yet." }} />
      </Card>
      {data && data.total > data.pageSize && (
        <div className="mt-3 flex justify-end">
          <Pagination size="small" current={page} pageSize={data.pageSize} total={data.total} showSizeChanger={false} onChange={(pg) => (setPage(pg), load(q, pg))} />
        </div>
      )}
      <p className="mt-3 text-[12px] text-ink-muted">Each order of these goes to the supplier's dashboard at once. They ship it to your buyer, and their tracking and delivery reach your order. You and the supplier settle what's owed in Payments.</p>
    </div>
  );
}

/** Your products for other Oyklane stores to sell. */
function SellToStores() {
  const { message } = App.useApp();
  const [p, setP] = useState(null);
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState([]);
  const timer = useRef(null);
  useEffect(() => {
    apiFetch("/api/dropship/network/profile")
      .then((d) => {
        setP(d.profile);
        setOptions((d.profile.picked || []).map((x) => ({ value: x.id, label: x.title })));
      })
      .catch((err) => message.error(err.message));
  }, [message]);
  const search = (term) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const d = await apiFetch(`/api/products?q=${encodeURIComponent(term || "")}&status=active&pageSize=20`).catch(() => ({}));
      setOptions((cur) => {
        const keep = cur.filter((o) => p?.productIds?.includes(o.value));
        const found = (d.products || []).map((x) => ({ value: x.id, label: x.title }));
        return [...keep, ...found.filter((o) => !keep.some((k) => k.value === o.value))];
      });
    }, 250);
  };
  async function save() {
    setBusy(true);
    try {
      const d = await apiFetch("/api/dropship/network/profile", { method: "PUT", body: p });
      setP(d.profile);
      message.success(d.profile.active ? "Saved. Other stores can sell your products." : "Saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  if (!p) return <Card size="small" loading />;
  const set = (patch) => setP({ ...p, ...patch });
  const example = 1000 * (1 - Number(p.discountPct || 0) / 100);
  return (
    <div className="grid max-w-3xl grid-cols-1 gap-4">
      <Card size="small">
        <label className="flex items-start gap-3 text-[13px]">
          <Switch checked={p.active} onChange={(active) => set({ active })} />
          <span>
            <span className="font-medium text-ink">Let other Oyklane stores sell my products</span>
            <span className="block text-ink-muted">They add your products to their store. Each order comes to your Orders to ship to their buyer, with no prices or invoice in the box. {p.active ? `${p.listed} product${p.listed === 1 ? "" : "s"} listed, ${p.sellers} store${p.sellers === 1 ? "" : "s"} selling them.` : ""}</span>
          </span>
        </label>
      </Card>
      <Card size="small" title="What other stores pay">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label>
            <span className="mb-1 block text-[12px] text-ink-muted">Discount off your price (%)</span>
            <InputNumber className="!w-full" min={0} max={90} value={p.discountPct} onChange={(discountPct) => set({ discountPct: discountPct ?? 0 })} />
          </label>
          <label>
            <span className="mb-1 block text-[12px] text-ink-muted">Packing and shipping, per order</span>
            <InputNumber className="!w-full" min={0} max={10000} value={p.shippingFee} onChange={(shippingFee) => set({ shippingFee: shippingFee ?? 0 })} />
          </label>
          <label>
            <span className="mb-1 block text-[12px] text-ink-muted">Ships within (days)</span>
            <InputNumber className="!w-full" min={0} max={30} value={p.dispatchDays} onChange={(dispatchDays) => set({ dispatchDays: dispatchDays ?? 0 })} />
          </label>
        </div>
        <p className="mt-2 text-[12px] text-ink-muted">
          A product you sell for {formatCurrency(1000)} costs them {formatCurrency(example)}
          {p.shippingFee ? `, plus ${formatCurrency(p.shippingFee)} per order` : ""}, plus tax as on your own orders.
        </p>
      </Card>
      <Card size="small" title="Products other stores can sell">
        <Radio.Group value={p.listAll ? "all" : "some"} onChange={(e) => set({ listAll: e.target.value === "all" })} className="flex flex-col gap-2">
          <Radio value="all">All my products on sale</Radio>
          <Radio value="some">Only these products</Radio>
        </Radio.Group>
        {!p.listAll && (
          <Select mode="multiple" showSearch filterOption={false} onSearch={search} onFocus={() => options.length <= (p.productIds?.length || 0) && search("")} value={p.productIds} onChange={(productIds) => set({ productIds })} options={options} placeholder="Search your products" className="mt-3 !w-full" />
        )}
      </Card>
      <Card size="small" title="About you (other stores see it)">
        <Input.TextArea rows={3} maxLength={500} value={p.about} placeholder="What you make, where you ship from, your returns rule" onChange={(e) => set({ about: e.target.value })} />
      </Card>
      <div>
        <Button type="primary" loading={busy} onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}

/** What you and each Oyklane store you trade with owe each other. */
function Payments() {
  const { message, modal } = App.useApp();
  const [rows, setRows] = useState(null);
  const [record, setRecord] = useState(null);
  const [history, setHistory] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    apiFetch("/api/dropship/network/balances").then((d) => setRows(d.balances)).catch((err) => message.error(err.message));
  }, [message]);
  useEffect(load, [load]);

  async function save() {
    setBusy(true);
    try {
      await apiFetch("/api/dropship/network/payments", { method: "POST", body: record });
      message.success("Payment recorded");
      setRecord(null);
      load();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function openHistory(b) {
    setHistory({ store: b, list: null });
    const d = await apiFetch(`/api/dropship/network/payments?storeId=${b.storeId}&role=${b.role}`).catch((err) => (message.error(err.message), { payments: [] }));
    setHistory({ store: b, list: d.payments });
  }
  async function removePayment(id) {
    try {
      await apiFetch(`/api/dropship/network/payments/${id}`, { method: "DELETE" });
      message.success("Payment removed");
      setHistory((h) => ({ ...h, list: h.list.filter((x) => x.id !== id) }));
      load();
    } catch (err) {
      message.error(err.message);
    }
  }

  const columns = [
    {
      title: "Store",
      render: (_, b) => (
        <div className="text-[13px]">
          <span className="font-medium text-ink">{b.name}</span>
          <span className="block text-ink-muted">{b.role === "supplier" ? "Your supplier" : "Sells your products"}</span>
        </div>
      ),
    },
    { title: "Delivered orders", dataIndex: "delivered", width: 130, align: "right" },
    { title: "On the way", dataIndex: "open", width: 100, align: "right" },
    { title: "Owed for delivered", dataIndex: "owed", width: 150, align: "right", render: (v) => formatCurrency(v) },
    { title: "Cash collected", dataIndex: "collected", width: 130, align: "right", render: (v, b) => <span title={b.role === "supplier" ? "Cash on delivery their courier collected for you" : "Cash on delivery your courier collected for them"}>{formatCurrency(v)}</span> },
    {
      title: "Balance",
      dataIndex: "balance",
      width: 170,
      align: "right",
      render: (v) => (Math.abs(v) < 0.01 ? <span className="text-ink-muted">Settled</span> : v > 0 ? <span className="text-red-600">You owe {formatCurrency(v)}</span> : <span className="text-green-700">Owes you {formatCurrency(-v)}</span>),
    },
    {
      title: "",
      width: 190,
      align: "right",
      render: (_, b) => (
        <span className="inline-flex gap-1">
          <Button size="small" onClick={() => setRecord({ storeId: b.storeId, role: b.role, name: b.name, direction: b.balance >= 0 ? "paid" : "received", amount: Math.abs(b.balance) || null, reference: "", note: "" })}>
            Record payment
          </Button>
          <Button size="small" type="text" onClick={() => openHistory(b)}>
            History
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <p className="mb-3 text-[13px] text-ink-muted">For orders between you and other Oyklane stores. What's owed counts once an order is delivered. Cash on delivery the supplier's courier collected counts toward the seller. Pay each other by bank or UPI, then record it here; both stores see it.</p>
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table rowKey={(b) => `${b.role}:${b.storeId}`} size="middle" loading={!rows} columns={columns} dataSource={rows || []} pagination={false} scroll={{ x: 980 }} locale={{ emptyText: "No orders with other Oyklane stores yet." }} />
      </Card>

      <Modal open={Boolean(record)} title={record ? `Record a payment with ${record.name}` : ""} okText="Record payment" okButtonProps={{ loading: busy }} onCancel={() => setRecord(null)} onOk={save}>
        {record && (
          <div className="grid grid-cols-1 gap-3">
            <Radio.Group value={record.direction} onChange={(e) => setRecord({ ...record, direction: e.target.value })} className="flex flex-col gap-2">
              <Radio value="paid">You paid {record.name}</Radio>
              <Radio value="received">{record.name} paid you</Radio>
            </Radio.Group>
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Amount</span>
              <InputNumber className="!w-full" min={0.01} value={record.amount} onChange={(amount) => setRecord({ ...record, amount })} />
            </label>
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Reference (UPI or bank transaction ID)</span>
              <Input maxLength={120} value={record.reference} onChange={(e) => setRecord({ ...record, reference: e.target.value })} />
            </label>
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Note</span>
              <Input maxLength={300} value={record.note} onChange={(e) => setRecord({ ...record, note: e.target.value })} />
            </label>
          </div>
        )}
      </Modal>

      <Drawer open={Boolean(history)} width={520} title={history ? `Payments with ${history.store.name}` : ""} onClose={() => setHistory(null)}>
        {history && (
          <Table
            rowKey="id"
            size="small"
            loading={!history.list}
            dataSource={history.list || []}
            pagination={false}
            locale={{ emptyText: "No payments recorded yet" }}
            columns={[
              { title: "Date", dataIndex: "createdAt", width: 110, render: (d) => new Date(d).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) },
              { title: "", dataIndex: "direction", render: (d, x) => <span className="text-[13px]">{d === "paid" ? "You paid" : "They paid you"}{x.reference ? <span className="block text-ink-muted">{x.reference}</span> : null}</span> },
              { title: "Amount", dataIndex: "amount", width: 110, align: "right", render: (v) => formatCurrency(v) },
              {
                title: "",
                width: 80,
                align: "right",
                render: (_, x) =>
                  x.mine ? (
                    <Button size="small" type="text" danger onClick={() => modal.confirm({ title: "Remove this payment?", okText: "Remove", okButtonProps: { danger: true }, onOk: () => removePayment(x.id) })}>
                      Remove
                    </Button>
                  ) : null,
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  );
}
