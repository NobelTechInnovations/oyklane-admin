"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { App, Button, Card, Empty, Input, InputNumber, Modal, Segmented, Select, Tag } from "antd";
import { ImageIcon, Minus, Plus, Printer, QrCode, ScanLine, Trash2, X } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { formatCurrency } from "@/lib/money";
import { apiFetch } from "@/lib/api";

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** A product photo that falls back to a plain tile when it's missing or doesn't load. */
function Photo({ src, className }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken)
    return (
      <span className={`flex items-center justify-center bg-app-bg text-ink-subtle ${className}`}>
        <ImageIcon size={22} strokeWidth={1.5} aria-hidden="true" />
      </span>
    );
  return <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className={`object-cover ${className}`} />;
}

/** Point of sale: sell at the counter. Each sale is a paid, handed-over order (pos/service.js). */
export default function PosPage() {
  const { message } = App.useApp();
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [lines, setLines] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState("amount");
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [payment, setPayment] = useState("cash");
  const [cashGiven, setCashGiven] = useState(null);
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [qr, setQr] = useState(null);
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
      return [...ls, { variantId: p.variantId, productTitle: p.productTitle || p.title, variant: p.variant || null, sku: p.sku, image: p.image, price: p.price, quantity: 1 }];
    });
  const setLine = (k, patch) => setLines((ls) => ls.map((x, j) => (j === k ? { ...x, ...patch } : x)));
  const inSale = (variantId) => lines.find((l) => l.variantId === variantId)?.quantity || 0;

  // A scanner types the SKU and Enter: an exact SKU goes straight in.
  async function onEnter() {
    if (!q.trim()) return;
    const d = await apiFetch(`/api/pos/products?q=${encodeURIComponent(q)}`).catch(() => ({ products: [] }));
    const exact = (d.products || []).find((p) => p.exact) || ((d.products || []).length === 1 ? d.products[0] : null);
    if (exact) {
      add(exact);
      setQ("");
      search("");
    } else setResults(d.products || []);
  }

  const items = lines.reduce((n, l) => n + l.quantity, 0);
  const subtotal = r2(lines.reduce((n, l) => n + l.price * l.quantity, 0));
  const off = r2(Math.min(subtotal, discountType === "percent" ? (subtotal * Math.min(100, discount || 0)) / 100 : discount || 0));
  const total = r2(Math.max(0, subtotal - off));
  const change = payment === "cash" && cashGiven > total ? r2(cashGiven - total) : 0;
  const short = payment === "cash" && cashGiven != null && cashGiven < total;
  const quick = [...new Set([total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 2000) * 2000].filter((v) => v > 0))].slice(0, 4);

  function clear() {
    setLines([]);
    setDiscount(0);
    setCustomer({ name: "", phone: "" });
    setCashGiven(null);
    scan.current?.focus();
  }
  async function showQr() {
    setQr({ loading: true });
    const d = await apiFetch(`/api/pos/upi-qr?amount=${total}`).catch((err) => (message.error(err.message), null));
    setQr(d && d.ready ? d : d ? { missing: true } : null);
  }
  async function complete() {
    setBusy(true);
    try {
      const r = await apiFetch("/api/pos/sales", { method: "POST", body: { items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, price: l.price })), discount: off, payment, customer, locationId, cashGiven } });
      setReceipt(r.receipt);
      setQr(null);
      clear();
      search(q);
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
            <Select value={locationId} onChange={setLocationId} options={locations.filter((l) => l.active || l.isDefault).map((l) => ({ value: l.id, label: `Selling from ${l.name}` }))} className="!w-60" aria-label="Selling from" />
          )
        }
      />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card size="small" styles={{ body: { padding: 12 } }}>
          <Input ref={scan} size="large" allowClear prefix={<ScanLine size={16} className="text-ink-subtle" aria-hidden="true" />} placeholder="Scan a barcode or search products" value={q} onChange={(e) => (setQ(e.target.value), search(e.target.value))} onPressEnter={onEnter} />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {(results || []).map((p) => {
              const n = inSale(p.variantId);
              return (
                <button key={p.variantId} type="button" onClick={() => add(p)} className={`relative flex flex-col overflow-hidden rounded-lg border bg-white text-left transition-colors hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 ${n ? "border-ink" : "border-line"}`}>
                  {n > 0 && <span className="absolute right-1.5 top-1.5 z-10 min-w-[22px] rounded-full bg-ink px-1.5 text-center text-[12px] font-semibold leading-[22px] text-white">{n}</span>}
                  <Photo src={p.image} className="aspect-square w-full" />
                  <span className="flex flex-1 flex-col gap-0.5 p-2">
                    <span className="line-clamp-2 text-[13px] font-medium leading-snug text-ink" title={p.productTitle || p.title}>
                      {p.productTitle || p.title}
                    </span>
                    {p.variant && <span className="truncate text-[12px] text-ink-muted">{p.variant}</span>}
                    <span className="mt-auto flex items-center justify-between gap-1 pt-1">
                      <span className="text-[13px] font-semibold text-ink">{formatCurrency(p.price)}</span>
                      <span className={`text-[11px] ${p.stock <= 0 ? "text-red-600" : p.stock <= 5 ? "text-amber-600" : "text-ink-muted"}`}>{p.stock <= 0 ? "Out of stock" : `${p.stock} left`}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {results && !results.length && <Empty className="!my-10" description={q ? "No products match" : "No products on sale yet"} />}
        </Card>

        <Card
          size="small"
          className="lg:sticky lg:top-4"
          title={items ? `Sale · ${items} item${items === 1 ? "" : "s"}` : "Sale"}
          extra={
            lines.length > 0 && (
              <Button size="small" type="text" icon={<X size={14} />} onClick={clear}>
                Clear
              </Button>
            )
          }
          styles={{ body: { padding: 0 } }}
        >
          {!lines.length ? (
            <p className="m-0 px-4 py-10 text-center text-[13px] text-ink-muted">Scan or tap a product to add it.</p>
          ) : (
            <ul className="m-0 max-h-[46vh] list-none overflow-y-auto p-0">
              {lines.map((l, k) => (
                <li key={l.variantId} className="flex gap-3 border-b border-line px-4 py-3 last:border-b-0">
                  <Photo src={l.image} className="h-11 w-11 shrink-0 rounded-md border border-line" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 text-[13px] font-medium leading-snug text-ink">
                        <span className="line-clamp-2">{l.productTitle}</span>
                        {(l.variant || l.sku) && <span className="block truncate text-[12px] font-normal text-ink-muted">{[l.variant, l.sku].filter(Boolean).join(" · ")}</span>}
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold text-ink">{formatCurrency(l.price * l.quantity)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md border border-line">
                        <Button size="small" type="text" icon={<Minus size={12} />} aria-label="One less" disabled={l.quantity <= 1} onClick={() => setLine(k, { quantity: Math.max(1, l.quantity - 1) })} />
                        <span className="w-7 text-center text-[13px] tabular-nums">{l.quantity}</span>
                        <Button size="small" type="text" icon={<Plus size={12} />} aria-label="One more" onClick={() => setLine(k, { quantity: l.quantity + 1 })} />
                      </span>
                      <span className="text-[12px] text-ink-muted">at</span>
                      <InputNumber size="small" min={0} controls={false} value={l.price} onChange={(price) => setLine(k, { price: price ?? 0 })} className="!w-24" aria-label="Price each" />
                      <Button size="small" type="text" danger icon={<Trash2 size={14} />} aria-label="Remove" className="!ml-auto" onClick={() => setLines((ls) => ls.filter((_, j) => j !== k))} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-3 border-t border-line px-4 py-3 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-muted">Discount</span>
              <span className="flex items-center gap-2">
                <Segmented size="small" value={discountType} onChange={(v) => (setDiscountType(v), setDiscount(0))} options={[{ value: "amount", label: "₹" }, { value: "percent", label: "%" }]} />
                <InputNumber size="small" min={0} max={discountType === "percent" ? 100 : undefined} controls={false} value={discount} onChange={(v) => setDiscount(v || 0)} className="!w-24" aria-label="Discount" />
              </span>
            </div>
            {off > 0 && (
              <div className="flex items-center justify-between text-ink-muted">
                <span>You save</span>
                <span className="tabular-nums">−{formatCurrency(off)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-[15px] font-semibold">Total</span>
              <span className="text-[20px] font-semibold tabular-nums">{formatCurrency(total)}</span>
            </div>
            <p className="m-0 -mt-1 text-[12px] text-ink-muted">Tax is worked out as for online orders and shows on the receipt.</p>
          </div>

          <div className="flex flex-col gap-3 border-t border-line px-4 py-3 text-[13px]">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Customer name (optional)" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              <Input placeholder="Phone (optional)" inputMode="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
            </div>
            <Segmented block value={payment} onChange={(v) => (setPayment(v), setQr(null))} options={[{ value: "cash", label: "Cash" }, { value: "upi", label: "UPI" }, { value: "card", label: "Card" }]} />
            {payment === "cash" && lines.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span>Cash received</span>
                  <InputNumber min={0} controls={false} value={cashGiven} onChange={setCashGiven} className="!w-32" placeholder="0" aria-label="Cash received" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quick.map((v) => (
                    <Button key={v} size="small" onClick={() => setCashGiven(v)}>
                      {v === total ? "Exact" : formatCurrency(v)}
                    </Button>
                  ))}
                </div>
                {change > 0 && (
                  <div className="flex items-center justify-between rounded-md bg-app-bg px-3 py-2">
                    <span>Change to give</span>
                    <span className="text-[15px] font-semibold tabular-nums">{formatCurrency(change)}</span>
                  </div>
                )}
                {short && <span className="text-[12px] text-red-600">{formatCurrency(total - cashGiven)} more to collect</span>}
              </div>
            )}
            {payment === "upi" && lines.length > 0 && (
              <div className="flex flex-col gap-2">
                {!qr && (
                  <Button icon={<QrCode size={14} />} onClick={showQr}>
                    Show UPI QR for {formatCurrency(total)}
                  </Button>
                )}
                {qr?.loading && <p className="m-0 text-center text-ink-muted">Making the QR…</p>}
                {qr?.missing && <p className="m-0 text-[12px] text-ink-muted">Set up Apps ▸ UPI QR to show a QR here. Or take payment on your own UPI scanner, then complete the sale.</p>}
                {qr?.qr && (
                  <div className="flex flex-col items-center gap-1 rounded-md border border-line p-3">
                    <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.qr)}`} alt={`UPI QR for ${formatCurrency(qr.amount)}`} className="h-44 w-44" />
                    <span className="font-semibold">{formatCurrency(qr.amount)}</span>
                    <span className="text-[12px] text-ink-muted">
                      {qr.name} · {qr.vpa}
                    </span>
                    {r2(qr.amount) !== total && (
                      <Button size="small" type="link" onClick={showQr}>
                        Total changed: show the new QR
                      </Button>
                    )}
                  </div>
                )}
                <p className="m-0 text-[12px] text-ink-muted">Complete the sale once the customer's app shows it paid.</p>
              </div>
            )}
            <Button type="primary" size="large" block loading={busy} disabled={!lines.length || short} onClick={complete}>
              {lines.length ? `Complete sale · ${formatCurrency(total)}` : "Complete sale"}
            </Button>
          </div>
        </Card>
      </div>

      <Modal open={Boolean(receipt)} onCancel={() => (setReceipt(null), scan.current?.focus())} title="Receipt" footer={[<Button key="new" onClick={() => (setReceipt(null), scan.current?.focus())}>New sale</Button>, <Button key="print" icon={<Printer size={14} />} type="primary" onClick={() => window.print()}>Print receipt</Button>]}>
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
                <span className="tabular-nums">{formatCurrency(i.total, receipt.currency)}</span>
              </div>
            ))}
            <div className="mt-2 border-t border-dashed border-line pt-2">
              {receipt.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span className="tabular-nums">−{formatCurrency(receipt.discount, receipt.currency)}</span>
                </div>
              )}
              {receipt.tax && (
                <div className="flex justify-between">
                  <span>{receipt.tax.label}</span>
                  <span className="tabular-nums">{formatCurrency(receipt.tax.amount, receipt.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>Total ({receipt.payment})</span>
                <span className="tabular-nums">{formatCurrency(receipt.total, receipt.currency)}</span>
              </div>
              {receipt.change != null && (
                <div className="flex justify-between text-ink-muted">
                  <span>Cash {formatCurrency(receipt.cashGiven, receipt.currency)}, change</span>
                  <span className="tabular-nums">{formatCurrency(receipt.change, receipt.currency)}</span>
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
