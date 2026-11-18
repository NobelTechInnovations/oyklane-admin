"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Checkbox, Collapse, Drawer, Input, InputNumber, Select, Spin } from "antd";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@shopcycle/utils";
import { apiFetch } from "@/lib/api";

const ADDRESS = [
  ["name", "shippingName", "Name"],
  ["phone", "phone", "Phone"],
  ["address1", "shippingAddress1", "Address"],
  ["address2", "shippingAddress2", "Apartment, landmark (optional)"],
  ["city", "shippingCity", "City"],
  ["province", "shippingProvince", "State"],
  ["zip", "shippingZip", "PIN code"],
];

/** Search the store's products; each variant is one option. */
function AddProduct({ onAdd }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);
  const search = (q) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const d = await apiFetch(`/api/products?q=${encodeURIComponent(q || "")}&pageSize=20&status=active`);
        const list = d.products || d.items || [];
        setOptions(
          list.flatMap((p) =>
            (p.variants || [])
              .filter((v) => v.status !== "archived")
              .map((v) => ({ value: v.id, label: `${p.title}${v.title && v.title !== "Default" ? ` — ${v.title}` : ""}`, price: Number(v.price), stock: v.inventoryQuantity }))
          )
        );
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  };
  return (
    <Select
      showSearch
      value={null}
      placeholder="Add a product: search by name or SKU"
      filterOption={false}
      onSearch={search}
      onFocus={() => !options.length && search("")}
      notFoundContent={loading ? <Spin size="small" /> : "No products found"}
      options={options.map((o) => ({ value: o.value, label: o.label, o }))}
      optionRender={(opt) => (
        <span className="flex items-center justify-between gap-3">
          <span className="truncate">{opt.data.o.label}</span>
          <span className="shrink-0 text-xs text-ink-muted">
            {formatCurrency(opt.data.o.price)} · {opt.data.o.stock} in stock
          </span>
        </span>
      )}
      onChange={(id) => {
        const o = options.find((x) => x.value === id);
        if (o) onAdd({ variantId: o.value, title: o.label, price: o.price, quantity: 1 });
      }}
      className="w-full"
      aria-label="Add a product"
    />
  );
}

/**
 * Edit an order after it's placed: quantities, prices, items, the shipping
 * fee and the delivery address. The summary shows what changes before
 * anything is saved (POST /orders/:id/edit/preview).
 */
export function EditOrderDrawer({ order, open, onClose, onDone }) {
  const { message } = App.useApp();
  const q = order.quantities || {};
  const shipped = order.fulfillments.some((f) => f.status !== "cancelled");
  const cur = order.currency || "INR";
  const money = (n) => formatCurrency(n, cur);
  const [items, setItems] = useState({}); // orderItemId → { quantity, price }
  const [added, setAdded] = useState([]); // { variantId, title, price, quantity }
  const [fee, setFee] = useState(null);
  const [address, setAddress] = useState({});
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setItems(Object.fromEntries(order.items.map((i) => [i.id, { quantity: i.quantity, price: Number(i.price) }])));
    setAdded([]);
    setFee(Number(order.shipping));
    setAddress(Object.fromEntries(ADDRESS.map(([k, field]) => [k, order[field] || ""])));
    setReason("");
    setNotify(true);
    setPreview(null);
    setError(null);
  }, [open, order]);

  const body = useMemo(
    () => ({
      items: order.items.map((i) => ({ orderItemId: i.id, quantity: items[i.id]?.quantity ?? i.quantity, ...(items[i.id] && items[i.id].price !== Number(i.price) ? { price: items[i.id].price } : {}) })),
      add: added.map(({ variantId, quantity, price }) => ({ variantId, quantity, price })),
      shippingFee: fee ?? undefined,
      ...(!shipped && { shipping: address }),
      reason: reason || undefined,
      notify,
    }),
    [order.items, items, added, fee, address, reason, notify, shipped]
  );

  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    const t = setTimeout(async () => {
      try {
        const p = await apiFetch(`/api/orders/${order.id}/edit/preview`, { method: "POST", body });
        if (live) {
          setPreview(p);
          setError(null);
        }
      } catch (err) {
        if (live) {
          setPreview(null);
          setError(err.message);
        }
      }
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [open, body, order.id]);

  async function save() {
    setSaving(true);
    try {
      await apiFetch(`/api/orders/${order.id}/edit`, { method: "POST", body });
      message.success("Order updated");
      onDone();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const setItem = (id, patch) => setItems((s) => ({ ...s, [id]: { ...s[id], ...patch } }));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="min(880px, 100vw)"
      title={`Edit order #${order.orderNumber}`}
      footer={
        <div className="flex items-center justify-between gap-3">
          <Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)}>
            Email the customer about the changes
          </Checkbox>
          <span className="flex gap-2">
            <Button onClick={onClose}>Discard</Button>
            <Button type="primary" loading={saving} disabled={!preview?.changed} onClick={save}>
              Update order
            </Button>
          </span>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-4">
          <section>
            <h3 className="m-0 mb-2 text-[14px] font-semibold">Items</h3>
            <div className="overflow-x-auto rounded-md border border-app-border">
              <table className="w-full min-w-[520px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-app-border bg-app-bg text-left text-[12px] text-ink-muted">
                    <th className="px-3 py-2 font-medium">Product</th>
                    <th className="px-3 py-2 text-right font-medium">Price</th>
                    <th className="px-3 py-2 text-right font-medium">Quantity</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i) => {
                    const v = items[i.id] || { quantity: i.quantity, price: Number(i.price) };
                    const fixed = (q[i.id]?.ordered ?? i.quantity) - (q[i.id]?.toFulfill ?? i.quantity);
                    const rental = Boolean(i.properties?.rental);
                    return (
                      <tr key={i.id} className={`border-b border-app-border last:border-b-0 ${v.quantity === 0 ? "text-ink-subtle line-through" : ""}`}>
                        <td className="px-3 py-2">
                          {i.title}
                          {fixed > 0 && <span className="block text-[11.5px] text-ink-muted no-underline">{fixed} shipped</span>}
                          {rental && <span className="block text-[11.5px] text-ink-muted">Rental: change dates from the rental</span>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <InputNumber size="small" min={0} value={v.price} disabled={fixed > 0 || rental} onChange={(price) => setItem(i.id, { price: Number(price) || 0 })} style={{ width: 96 }} aria-label={`Price of ${i.title}`} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <InputNumber size="small" min={fixed} value={v.quantity} disabled={rental} onChange={(quantity) => setItem(i.id, { quantity: Math.max(fixed, Number(quantity) || 0) })} style={{ width: 72 }} aria-label={`Quantity of ${i.title}`} />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(v.price * v.quantity)}</td>
                        <td className="px-1 py-2 text-right">
                          <Button size="small" type="text" danger disabled={fixed > 0 || rental || v.quantity === 0} icon={<Trash2 size={13} aria-hidden="true" />} onClick={() => setItem(i.id, { quantity: 0 })} aria-label={`Remove ${i.title}`} />
                        </td>
                      </tr>
                    );
                  })}
                  {added.map((a, k) => (
                    <tr key={`${a.variantId}-${k}`} className="border-b border-app-border bg-accent-soft/40 last:border-b-0">
                      <td className="px-3 py-2">
                        {a.title}
                        <span className="block text-[11.5px] text-accent">Added</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <InputNumber size="small" min={0} value={a.price} onChange={(price) => setAdded((s) => s.map((x, j) => (j === k ? { ...x, price: Number(price) || 0 } : x)))} style={{ width: 96 }} aria-label={`Price of ${a.title}`} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <InputNumber size="small" min={1} value={a.quantity} onChange={(quantity) => setAdded((s) => s.map((x, j) => (j === k ? { ...x, quantity: Math.max(1, Number(quantity) || 1) } : x)))} style={{ width: 72 }} aria-label={`Quantity of ${a.title}`} />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(a.price * a.quantity)}</td>
                      <td className="px-1 py-2 text-right">
                        <Button size="small" type="text" danger icon={<Trash2 size={13} aria-hidden="true" />} onClick={() => setAdded((s) => s.filter((_, j) => j !== k))} aria-label={`Remove ${a.title}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2">
              <AddProduct onAdd={(a) => setAdded((s) => [...s, a])} />
            </div>
          </section>

          <section>
            <h3 className="m-0 mb-2 text-[14px] font-semibold">Shipping fee</h3>
            <InputNumber min={0} value={fee} onChange={(v) => setFee(Number(v) || 0)} prefix={cur === "INR" ? "₹" : cur} aria-label="Shipping fee" />
          </section>

          <Collapse
            size="small"
            items={[
              {
                key: "address",
                label: "Delivery address",
                children: shipped ? (
                  <p className="m-0 text-[13px] text-ink-muted">Part of this order has shipped, so the address can&apos;t change here. Update it with the courier.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ADDRESS.map(([k, , label]) => (
                      <label key={k} className={`flex flex-col gap-1 text-[12px] text-ink-muted ${k === "address1" || k === "address2" ? "sm:col-span-2" : ""}`}>
                        {label}
                        <Input value={address[k]} onChange={(e) => setAddress((s) => ({ ...s, [k]: e.target.value }))} />
                      </label>
                    ))}
                  </div>
                ),
              },
            ]}
          />

          <section>
            <h3 className="m-0 mb-2 text-[14px] font-semibold">Reason (optional)</h3>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. Customer asked by phone to add one more" />
          </section>
        </div>

        <aside className="flex flex-col gap-3">
          <section className="rounded-md border border-app-border bg-app-surface">
            <h3 className="m-0 border-b border-app-border px-4 py-3 text-[14px] font-semibold">Summary</h3>
            {error ? (
              <Alert className="m-3" type="error" showIcon message={error} />
            ) : !preview ? (
              <div className="p-4 text-center">
                <Spin size="small" />
              </div>
            ) : (
              <div className="flex flex-col gap-3 px-4 py-3 text-[13px]">
                {preview.changes.length ? (
                  <ul className="m-0 pl-4">
                    {preview.changes.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-ink-muted">No changes yet.</p>
                )}
                <dl className="m-0 grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1">
                  <dt className="text-ink-muted" />
                  <dd className="m-0 text-right text-[11.5px] text-ink-muted">Before</dd>
                  <dd className="m-0 text-right text-[11.5px] text-ink-muted">After</dd>
                  {[
                    ["Subtotal", preview.before.subtotal, preview.after.subtotal],
                    ["Shipping", preview.before.shipping, preview.after.shipping],
                    ["Tax", preview.before.tax, preview.after.tax],
                    ["Total", preview.before.total, preview.after.total],
                  ].map(([label, a, b]) => (
                    <div key={label} className="contents">
                      <dt className={label === "Total" ? "font-semibold" : "text-ink-muted"}>{label}</dt>
                      <dd className="m-0 text-right tabular-nums text-ink-muted">{money(a)}</dd>
                      <dd className={`m-0 text-right tabular-nums ${label === "Total" ? "font-semibold" : ""}`}>{money(b)}</dd>
                    </div>
                  ))}
                </dl>
                {preview.refund > 0 && <Alert type="info" showIcon message={`${money(preview.refund)} will be refunded to the customer.`} />}
                {preview.becomesBalance && <Alert type="warning" showIcon message={`${money(preview.collect)} more to collect`} description="The customer already paid online. The extra is collected on delivery, or they can pay it online from their order page." />}
                {!preview.becomesBalance && preview.paymentMethod === "cod" && preview.after.total !== preview.before.total && <p className="m-0 text-ink-muted">The courier collects {money(preview.collect)} on delivery.</p>}
                {preview.giftCardBack > 0 && <p className="m-0 text-ink-muted">{money(preview.giftCardBack)} goes back to the gift card.</p>}
                {preview.warnings.map((w) => (
                  <Alert key={w} type="warning" showIcon message={w} />
                ))}
              </div>
            )}
          </section>
          <p className="m-0 text-[11.5px] text-ink-subtle">Stock is updated for what&apos;s added or removed. An invoice already issued is cancelled and issued again.</p>
        </aside>
      </div>
    </Drawer>
  );
}
