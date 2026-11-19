"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { App, Button, Card, Checkbox, Dropdown, Input, InputNumber, Modal, Select, Switch, Table, Tag } from "antd";
import { MoreHorizontal, Plus, Upload } from "lucide-react";
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

/** Products ▸ Suppliers: dropshipping. Import a supplier's products with your markup; orders go to them to ship. */
export default function SuppliersPage() {
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
          <span className="font-medium text-ink">{s.name}</span>
          <span className="block text-ink-muted">{[s.email, s.whatsapp].filter(Boolean).join(", ") || "No contact yet"}</span>
        </div>
      ),
    },
    {
      title: "Orders go by",
      width: 150,
      render: (_, s) => (
        <span className="text-[13px]">
          {SEND_BY[s.sendBy]} {s.sendBy === "email" && !s.autoSend && <Tag className="!ml-1">You send</Tag>}
        </span>
      ),
    },
    { title: "Markup", dataIndex: "markupPct", width: 90, align: "right", render: (m) => `${Number(m)}%` },
    { title: "Products", dataIndex: "products", width: 90, align: "right" },
    { title: "To ship", dataIndex: "openOrders", width: 80, align: "right", render: (n) => (n ? <Tag color="orange">{n}</Tag> : 0) },
    { title: "Last import", dataIndex: "lastSyncAt", width: 130, render: (d) => (d ? new Date(d).toLocaleDateString([], { day: "numeric", month: "short" }) : "—") },
    {
      title: "",
      width: 170,
      align: "right",
      render: (_, s) => (
        <span className="inline-flex gap-1">
          <Button size="small" icon={<Upload size={13} />} onClick={() => setImportFor(s)}>
            Import
          </Button>
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "edit", label: "Edit", onClick: () => setEdit({ ...NEW, ...s, email: s.email || "", whatsapp: s.whatsapp || "", feedUrl: s.feedUrl || "", note: s.note || "" }) },
                { key: "price", label: "Apply markup to all prices", onClick: () => reprice(s) },
                { key: "csv", label: "Download orders to ship (CSV)", onClick: () => apiDownload(`/api/dropship/suppliers/${s.id}/orders.csv`, "supplier-orders.csv").catch((err) => message.error(err.message)) },
                { type: "divider" },
                { key: "remove", danger: true, label: "Remove", onClick: () => modal.confirm({ title: `Remove ${s.name}?`, content: "Their products stay in your store as your own.", okText: "Remove", okButtonProps: { danger: true }, onOk: () => remove(s) }) },
              ],
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
      <PageHeader
        title="Suppliers"
        subtitle="Sell a supplier's products without holding stock. Import their list with your markup; each order goes to them to ship, and their tracking reaches your buyer."
        backHref="/admin/products"
        actions={
          <Button type="primary" icon={<Plus size={14} />} onClick={() => setEdit({ ...NEW })}>
            Add supplier
          </Button>
        }
      />
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table rowKey="id" size="middle" loading={!suppliers} columns={columns} dataSource={suppliers || []} pagination={false} scroll={{ x: 860 }} locale={{ emptyText: "No suppliers yet. Add one, then import their products from a CSV file or feed link." }} />
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
        {edit && <SupplierForm value={edit} onChange={setEdit} />}
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
