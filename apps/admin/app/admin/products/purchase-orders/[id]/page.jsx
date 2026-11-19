"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { App, AutoComplete, Button, Card, Checkbox, Input, InputNumber, Modal, Select, Table, Tag } from "antd";
import { Barcode, PackagePlus, Trash2 } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { formatCurrency, currencySymbol } from "@/lib/money";
import { apiFetch } from "@/lib/api";
import { PO_STATUS } from "../status";

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const EMPTY = { vendor: "", vendorEmail: "", locationId: null, expectedAt: null, note: "", shipping: 0, items: [] };

/** One purchase order: what's bought, ordering it, receiving it. */
export default function PurchaseOrderPage() {
  const { message, modal } = App.useApp();
  const router = useRouter();
  const { id } = useParams();
  const isNew = id === "new";
  const [po, setPo] = useState(isNew ? null : undefined);
  const [form, setForm] = useState(EMPTY);
  const [locations, setLocations] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [options, setOptions] = useState([]);
  const [busy, setBusy] = useState(null);
  const [receiving, setReceiving] = useState(null);
  const [ordering, setOrdering] = useState(null);
  const timer = useRef(null);

  const fill = (p) => {
    setPo(p);
    setForm({ vendor: p.vendor, vendorEmail: p.vendorEmail || "", locationId: p.locationId, expectedAt: p.expectedAt, note: p.note || "", shipping: p.shipping, items: p.items.map((i) => ({ variantId: i.variantId, title: i.title, sku: i.sku, quantity: i.quantity, cost: i.cost, received: i.received, stock: i.stock, id: i.id })) });
  };
  useEffect(() => {
    if (!isNew)
      apiFetch(`/api/purchase-orders/${id}`)
        .then((d) => fill(d.purchaseOrder))
        .catch((err) => (message.error(err.message), setPo(null)));
    apiFetch("/api/locations").then((d) => setLocations(d.locations || [])).catch(() => {});
    apiFetch("/api/dropship/suppliers")
      .then((d) => setVendors((d.suppliers || []).filter((s) => !s.network).map((s) => ({ value: s.name, email: s.email || "" }))))
      .catch(() => {});
  }, [id, isNew, message]);

  const editable = isNew || ["draft", "ordered", "partial"].includes(po?.status);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setLine = (k, patch) => set({ items: form.items.map((x, j) => (j === k ? { ...x, ...patch } : x)) });
  const subtotal = r2(form.items.reduce((n, i) => n + (Number(i.quantity) || 0) * (Number(i.cost) || 0), 0));
  const total = r2(subtotal + (Number(form.shipping) || 0));

  const search = (q) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const d = await apiFetch(`/api/pos/products?q=${encodeURIComponent(q || "")}`).catch(() => ({ products: [] }));
      setOptions((d.products || []).map((p) => ({ value: p.variantId, label: `${p.title}${p.sku ? ` · ${p.sku}` : ""}`, product: p })));
    }, 250);
  };
  function addVariant(variantId, opt) {
    if (form.items.some((i) => i.variantId === variantId)) return message.info("It's already on the list");
    const p = opt.product;
    set({ items: [...form.items, { variantId, title: p.title, sku: p.sku, quantity: 1, cost: null, received: 0, stock: p.stock }] });
  }
  async function addLowStock() {
    const d = await apiFetch("/api/purchase-orders/low-stock").catch((err) => (message.error(err.message), null));
    if (!d) return;
    const add = d.products.filter((p) => !form.items.some((i) => i.variantId === p.variantId)).map((p) => ({ variantId: p.variantId, title: p.title, sku: p.sku, quantity: Math.max(1, p.level * 2 - p.stock - p.onOrder), cost: p.cost, received: 0, stock: p.stock }));
    if (!add.length) return message.info("Nothing else is low on stock");
    set({ items: [...form.items, ...add] });
    message.success(`${add.length} low-stock product${add.length === 1 ? "" : "s"} added`);
  }

  async function save() {
    setBusy("save");
    try {
      const body = { ...form, items: form.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, cost: i.cost ?? 0 })) };
      const d = await apiFetch(isNew ? "/api/purchase-orders" : `/api/purchase-orders/${id}`, { method: isNew ? "POST" : "PATCH", body });
      message.success(isNew ? `${d.purchaseOrder.name} saved as a draft` : "Saved");
      if (isNew) router.replace(`/admin/products/purchase-orders/${d.purchaseOrder.id}`);
      else fill(d.purchaseOrder);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }
  async function act(path, body, done) {
    setBusy(path);
    try {
      const d = await apiFetch(`/api/purchase-orders/${id}/${path}`, { method: "POST", body: body || {} });
      fill(d.purchaseOrder);
      message.success(done);
      return d.purchaseOrder;
    } catch (err) {
      message.error(err.message);
      return null;
    } finally {
      setBusy(null);
    }
  }
  async function receive() {
    const lines = Object.entries(receiving).map(([itemId, quantity]) => ({ itemId, quantity }));
    const done = await act("receive", { lines }, "Stock received");
    if (done) setReceiving(null);
  }

  if (po === undefined) return <Card loading />;
  if (!isNew && !po) return <Card>Purchase order not found.</Card>;
  const [statusLabel, statusColor] = po ? PO_STATUS[po.status] || [po.status] : ["New", "default"];
  const due = (form.items || []).filter((i) => i.received < i.quantity);

  return (
    <div>
      <PageHeader
        title={po ? po.name : "New purchase order"}
        subtitle={po ? <Tag color={statusColor}>{statusLabel}</Tag> : "Stock you're buying from a vendor."}
        backHref="/admin/products/purchase-orders"
        actions={
          <span className="inline-flex flex-wrap gap-2">
            {po && po.receivedUnits > 0 && (
              <Button icon={<Barcode size={14} />} href={`/admin/products/labels?po=${po.id}`}>
                Print labels
              </Button>
            )}
            {po?.status === "draft" && (
              <Button danger onClick={() => modal.confirm({ title: `Delete ${po.name}?`, okText: "Delete", okButtonProps: { danger: true }, onOk: async () => (await apiFetch(`/api/purchase-orders/${id}`, { method: "DELETE" }), router.replace("/admin/products/purchase-orders")) })}>
                Delete
              </Button>
            )}
            {po && ["ordered", "partial"].includes(po.status) && po.receivedUnits === 0 && (
              <Button onClick={() => modal.confirm({ title: `Cancel ${po.name}?`, okText: "Cancel order", okButtonProps: { danger: true }, cancelText: "Keep it", onOk: () => act("cancel", null, "Cancelled") })}>Cancel order</Button>
            )}
            {editable && (
              <Button loading={busy === "save"} onClick={save}>
                {isNew ? "Save draft" : "Save"}
              </Button>
            )}
            {po?.status === "draft" && (
              <Button type="primary" onClick={() => setOrdering({ email: Boolean(form.vendorEmail) })}>
                Mark as ordered
              </Button>
            )}
            {po && ["ordered", "partial"].includes(po.status) && (
              <Button type="primary" icon={<PackagePlus size={14} />} onClick={() => setReceiving(Object.fromEntries(due.map((i) => [i.id, i.quantity - i.received])))}>
                Receive stock
              </Button>
            )}
          </span>
        }
      />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card size="small" title="Products" extra={editable && <Button size="small" onClick={addLowStock}>Add low-stock products</Button>} styles={{ body: { padding: 0 } }}>
          {editable && (
            <div className="border-b border-line p-3">
              <Select showSearch filterOption={false} value={null} onSearch={search} onFocus={() => !options.length && search("")} onSelect={addVariant} options={options} placeholder="Search products to add" className="!w-full" />
            </div>
          )}
          <Table
            rowKey="variantId"
            size="small"
            pagination={false}
            dataSource={form.items}
            scroll={{ x: 680 }}
            locale={{ emptyText: "Add the products you're buying" }}
            columns={[
              {
                title: "Product",
                render: (_, i) => (
                  <span className="text-[13px]">
                    <span className="font-medium text-ink">{i.title}</span>
                    <span className="block text-ink-muted">{[i.sku, i.stock != null ? `${i.stock} in stock` : null].filter(Boolean).join(" · ")}</span>
                  </span>
                ),
              },
              { title: "Qty", width: 100, render: (_, i, k) => (editable ? <InputNumber size="small" min={Math.max(1, i.received || 0)} value={i.quantity} onChange={(quantity) => setLine(k, { quantity: quantity ?? 1 })} className="!w-20" /> : i.quantity) },
              { title: "Cost each", width: 130, render: (_, i, k) => (editable && !i.received ? <InputNumber size="small" min={0} prefix={currencySymbol()} value={i.cost} onChange={(cost) => setLine(k, { cost })} className="!w-28" /> : formatCurrency(i.cost || 0)) },
              { title: "Total", width: 110, align: "right", render: (_, i) => formatCurrency((Number(i.quantity) || 0) * (Number(i.cost) || 0)) },
              ...(po && po.status !== "draft" ? [{ title: "Received", width: 100, align: "right", render: (_, i) => <span className={i.received >= i.quantity ? "text-green-700" : ""}>{i.received} of {i.quantity}</span> }] : []),
              ...(editable ? [{ title: "", width: 44, render: (_, i, k) => (i.received ? null : <Button size="small" type="text" danger icon={<Trash2 size={13} />} aria-label="Remove" onClick={() => set({ items: form.items.filter((_, j) => j !== k) })} />) }] : []),
            ]}
          />
          <div className="flex flex-col gap-2 border-t border-line px-4 py-3 text-[13px]">
            <div className="flex justify-between">
              <span className="text-ink-muted">Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Shipping</span>
              {editable ? <InputNumber size="small" min={0} prefix={currencySymbol()} value={form.shipping} onChange={(shipping) => set({ shipping: shipping ?? 0 })} className="!w-28" /> : <span>{formatCurrency(form.shipping)}</span>}
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-[15px] font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>
        </Card>

        <Card size="small" title="Vendor and delivery">
          <div className="flex flex-col gap-3">
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Vendor</span>
              <AutoComplete className="!w-full" disabled={!editable} value={form.vendor} options={vendors} filterOption={(input, o) => o.value.toLowerCase().includes(input.toLowerCase())} onChange={(vendor) => set({ vendor })} onSelect={(v, o) => set({ vendor: v, vendorEmail: form.vendorEmail || o.email })} placeholder="Who you're buying from" />
            </label>
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Vendor email (optional)</span>
              <Input type="email" disabled={!editable} value={form.vendorEmail} onChange={(e) => set({ vendorEmail: e.target.value })} />
            </label>
            {locations.length > 1 && (
              <label>
                <span className="mb-1 block text-[12px] text-ink-muted">Receive into</span>
                <Select className="!w-full" disabled={!editable} value={form.locationId || locations.find((l) => l.isDefault)?.id} onChange={(locationId) => set({ locationId })} options={locations.map((l) => ({ value: l.id, label: l.name }))} />
              </label>
            )}
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Expected by (optional)</span>
              <Input type="date" disabled={!editable} value={form.expectedAt ? String(form.expectedAt).slice(0, 10) : ""} onChange={(e) => set({ expectedAt: e.target.value || null })} />
            </label>
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Note (goes to the vendor)</span>
              <Input.TextArea rows={3} disabled={!editable} maxLength={1000} value={form.note} onChange={(e) => set({ note: e.target.value })} />
            </label>
          </div>
        </Card>
      </div>

      <Modal open={Boolean(ordering)} title="Mark as ordered" okText="Mark as ordered" okButtonProps={{ loading: busy === "order" }} onCancel={() => setOrdering(null)} onOk={async () => (await act("order", { email: ordering.email }, ordering.email ? "Ordered and emailed to the vendor" : "Marked as ordered")) && setOrdering(null)}>
        {ordering && (
          <div className="flex flex-col gap-2 text-[13px]">
            <p className="m-0">Save your changes first. Once ordered, you can receive the stock as it arrives.</p>
            <Checkbox checked={ordering.email} disabled={!form.vendorEmail} onChange={(e) => setOrdering({ email: e.target.checked })}>
              Email it to {form.vendorEmail || "the vendor (add their email first)"}
            </Checkbox>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(receiving)} title="Receive stock" okText="Receive" okButtonProps={{ loading: busy === "receive" }} onCancel={() => setReceiving(null)} onOk={receive} width={560}>
        {receiving && (
          <div className="flex flex-col gap-2 text-[13px]">
            <p className="m-0 text-ink-muted">How many arrived? Stock goes up{locations.length > 1 ? ` in ${locations.find((l) => l.id === (form.locationId || locations.find((x) => x.isDefault)?.id))?.name || "the location"}` : ""}, and each product&apos;s cost becomes the average of what you have.</p>
            {due.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 border-t border-line pt-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{i.title}</span>
                  <span className="text-ink-muted">{i.quantity - i.received} still due</span>
                </span>
                <InputNumber min={0} max={i.quantity - i.received} value={receiving[i.id]} onChange={(v) => setReceiving({ ...receiving, [i.id]: v ?? 0 })} className="!w-24" />
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
