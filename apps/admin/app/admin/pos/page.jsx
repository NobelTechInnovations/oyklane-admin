"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { App, Button, Card, Empty, Input, InputNumber, Modal, Segmented, Select } from "antd";
import { Minus, Plus, Printer, Trash2 } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { formatCurrency } from "@/lib/money";
import { apiFetch } from "@/lib/api";

/** Point of sale: sell at the counter. Each sale is a paid, handed-over order (pos/service.js). */
export default function PosPage() {
  const { message } = App.useApp();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [lines, setLines] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [payment, setPayment] = useState("cash");
  const [cashGiven, setCashGiven] = useState(null);
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const timer = useRef(null);
  const scan = useRef(null);

  const search = useCallback((text) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const d = await apiFetch(`/api/pos/products?q=${encodeURIComponent(text || "")}`).catch(() => ({ products: [] }));
      setResults(d.products || []);
    }, 200);
  }, []);
  useEffect(() => {
    search("");
    apiFetch("/api/locations")
      .then((d) => (setLocations(d.locations || []), setLocationId((d.locations || []).find((l) => l.isDefault)?.id || null)))
      .catch(() => {});
    scan.current?.focus();
  }, [search]);

  const add = (p) =>
    setLines((ls) => {
      const i = ls.findIndex((l) => l.variantId === p.variantId);
      if (i >= 0) return ls.map((l, k) => (k === i ? { ...l, quantity: l.quantity + 1 } : l));
      return [...ls, { variantId: p.variantId, title: p.title, price: p.price, quantity: 1 }];
    });
  // A scanner types the SKU and Enter: an exact SKU goes straight in.
  async function onEnter() {
    const d = await apiFetch(`/api/pos/products?q=${encodeURIComponent(q)}`).catch(() => ({ products: [] }));
    const exact = (d.products || []).find((p) => p.exact) || ((d.products || []).length === 1 ? d.products[0] : null);
    if (exact) {
      add(exact);
      setQ("");
      search("");
    } else setResults(d.products || []);
  }
  const subtotal = lines.reduce((n, l) => n + l.price * l.quantity, 0);
  const total = Math.max(0, subtotal - (discount || 0));

  async function complete() {
    setBusy(true);
    try {
      const r = await apiFetch("/api/pos/sales", { method: "POST", body: { items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, price: l.price })), discount, payment, customer, locationId, cashGiven } });
      setReceipt(r.receipt);
      setLines([]);
      setDiscount(0);
      setCustomer({ name: "", phone: "" });
      setCashGiven(null);
      message.success(`Sale #${r.order.orderNumber} done`);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Point of sale"
        subtitle="Sell at the counter. Scan a barcode (the product's SKU) or search, then take payment."
        actions={
          locations.length > 1 && (
            <Select value={locationId} onChange={setLocationId} options={locations.filter((l) => l.active || l.isDefault).map((l) => ({ value: l.id, label: l.name }))} className="!w-56" aria-label="Selling from" />
          )
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <Card size="small">
          <Input ref={scan} size="large" allowClear placeholder="Scan or search products" value={q} onChange={(e) => (setQ(e.target.value), search(e.target.value))} onPressEnter={onEnter} />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {results.map((p) => (
              <button key={p.variantId} type="button" onClick={() => add(p)} className="flex flex-col items-start rounded-lg border border-line bg-white p-2 text-left hover:border-ink-muted">
                {p.image ? <img src={p.image} alt="" className="mb-1 h-20 w-full rounded object-cover" /> : <span className="mb-1 h-20 w-full rounded bg-app-bg" />}
                <span className="line-clamp-2 text-[13px] font-medium text-ink">{p.title}</span>
                <span className="text-[12px] text-ink-muted">
                  {formatCurrency(p.price)} · {p.stock} in stock
                </span>
              </button>
            ))}
          </div>
          {!results.length && <Empty className="!my-8" description="No products match" />}
        </Card>

        <Card size="small" title={`Sale${lines.length ? ` · ${lines.reduce((n, l) => n + l.quantity, 0)} items` : ""}`}>
          {!lines.length ? (
            <p className="m-0 py-6 text-center text-[13px] text-ink-muted">Scan or tap a product to add it.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {lines.map((l, k) => (
                <li key={l.variantId} className="flex items-center gap-2 text-[13px]">
                  <span className="min-w-0 flex-1 truncate">{l.title}</span>
                  <Button size="small" icon={<Minus size={12} />} aria-label="One less" onClick={() => setLines(lines.map((x, j) => (j === k ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))} />
                  <span className="w-6 text-center">{l.quantity}</span>
                  <Button size="small" icon={<Plus size={12} />} aria-label="One more" onClick={() => setLines(lines.map((x, j) => (j === k ? { ...x, quantity: x.quantity + 1 } : x)))} />
                  <InputNumber size="small" min={0} value={l.price} onChange={(price) => setLines(lines.map((x, j) => (j === k ? { ...x, price: price ?? 0 } : x)))} className="!w-24" aria-label="Price" />
                  <Button size="small" type="text" danger icon={<Trash2 size={14} />} aria-label="Remove" onClick={() => setLines(lines.filter((_, j) => j !== k))} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-col gap-3 border-t border-line pt-3 text-[13px]">
            <div className="flex items-center justify-between">
              <span>Discount</span>
              <InputNumber size="small" min={0} value={discount} onChange={(v) => setDiscount(v || 0)} className="!w-28" />
            </div>
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <p className="m-0 text-[12px] text-ink-muted">Tax is worked out as for online orders and shows on the receipt.</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Customer name (optional)" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              <Input placeholder="Phone (optional)" inputMode="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
            </div>
            <Segmented block value={payment} onChange={setPayment} options={[{ value: "cash", label: "Cash" }, { value: "upi", label: "UPI" }, { value: "card", label: "Card" }]} />
            {payment === "cash" && (
              <div className="flex items-center justify-between">
                <span>Cash received</span>
                <span className="flex items-center gap-2">
                  <InputNumber size="small" min={0} value={cashGiven} onChange={setCashGiven} className="!w-28" />
                  {cashGiven > total && <span className="text-ink-muted">Change {formatCurrency(cashGiven - total)}</span>}
                </span>
              </div>
            )}
            <Button type="primary" size="large" block loading={busy} disabled={!lines.length} onClick={complete}>
              Complete sale · {formatCurrency(total)}
            </Button>
          </div>
        </Card>
      </div>

      <Modal open={Boolean(receipt)} onCancel={() => (setReceipt(null), scan.current?.focus())} title="Receipt" footer={<Button icon={<Printer size={14} />} type="primary" onClick={() => window.print()}>Print receipt</Button>}>
        {receipt && (
          <div id="pos-receipt" className="text-[13px]">
            <p className="m-0 text-center font-semibold">{receipt.store}</p>
            {receipt.location && <p className="m-0 text-center text-ink-muted">{receipt.location}</p>}
            <p className="m-0 mb-2 text-center text-ink-muted">
              #{receipt.number} · {new Date(receipt.date).toLocaleString()}
            </p>
            {receipt.items.map((i, k) => (
              <div key={k} className="flex justify-between gap-2">
                <span>
                  {i.quantity} × {i.title}
                </span>
                <span>{formatCurrency(i.total, receipt.currency)}</span>
              </div>
            ))}
            <div className="mt-2 border-t border-dashed border-line pt-2">
              {receipt.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>−{formatCurrency(receipt.discount, receipt.currency)}</span>
                </div>
              )}
              {receipt.tax && (
                <div className="flex justify-between">
                  <span>{receipt.tax.label}</span>
                  <span>{formatCurrency(receipt.tax.amount, receipt.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>Total ({receipt.payment})</span>
                <span>{formatCurrency(receipt.total, receipt.currency)}</span>
              </div>
              {receipt.change != null && (
                <div className="flex justify-between text-ink-muted">
                  <span>Cash {formatCurrency(receipt.cashGiven, receipt.currency)}, change</span>
                  <span>{formatCurrency(receipt.change, receipt.currency)}</span>
                </div>
              )}
            </div>
            <p className="m-0 mt-3 text-center text-ink-muted">Thank you!</p>
          </div>
        )}
      </Modal>
      <style>{`@media print{body *{visibility:hidden}#pos-receipt,#pos-receipt *{visibility:visible}#pos-receipt{position:fixed;top:0;left:0;width:80mm}}`}</style>
    </div>
  );
}
