"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, Tag } from "antd";
import { formatCurrency } from "@/lib/money";
import { apiFetch } from "@/lib/api";

const STATUS = { pending: ["Not sent", "orange"], sent: ["Sent", "blue"], shipped: ["Shipped", "green"], delivered: ["Delivered", "green"], cancelled: ["Cancelled", "default"] };

/** Order page: items a supplier ships (Products ▸ Suppliers), and sending the order to them. */
export function SupplierOrdersCard({ order }) {
  const { message } = App.useApp();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    apiFetch(`/api/dropship/orders/${order.id}`).then((d) => setRows(d.supplierOrders || [])).catch(() => {});
  }, [order.id]);
  if (!rows.length) return null;

  async function send(so, how) {
    setBusy(so.id);
    try {
      const d = await apiFetch(`/api/dropship/supplier-orders/${so.id}/send`, { method: "POST", body: { how } });
      setRows((list) => list.map((r) => (r.id === so.id ? { ...r, ...d.supplierOrder } : r)));
      if (how === "email") message.success(so.network ? `Sent to ${so.supplier?.name}` : `Emailed to ${so.supplier?.name}`);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }
  function whatsapp(so) {
    window.open(so.whatsappUrl, "_blank", "noopener");
    send(so, "manual");
  }
  async function copy(so) {
    await navigator.clipboard?.writeText(so.trackingUrl).catch(() => {});
    message.success("Tracking link copied");
  }

  return (
    <Card size="small" title="Supplier ships">
      <div className="flex flex-col gap-3 text-[13px]">
        {rows.map((so, i) => {
          const [label, color] = STATUS[so.status] || [so.status];
          return (
            <div key={so.id} className={i ? "border-t border-line pt-3" : ""}>
              <span className="font-medium">{so.supplier?.name || "Supplier"}</span> <Tag color={color}>{label}</Tag>
              <span className="block text-ink-muted">{so.items.map((it) => `${it.quantity} × ${it.title}`).join(", ")}</span>
              {so.network && so.supplierOrderNumber && <span className="block text-ink-muted">On Oyklane, their order #{so.supplierOrderNumber}</span>}
              {so.network && so.status !== "cancelled" && <span className="block text-ink-muted">{so.collect > 0 ? `Their courier collects ${formatCurrency(so.collect, order.currency)} cash on delivery` : order.paymentMethod === "cod" ? "They ship without collecting cash: your parcel collects it" : "Prepaid"}</span>}
              {so.trackingNumber && <span className="block text-ink-muted">{[so.courier, so.trackingNumber].filter(Boolean).join(" ")}</span>}
              {so.network && so.status === "pending" && (
                <div className="mt-2">
                  <Button size="small" loading={busy === so.id} onClick={() => send(so, "email")}>
                    Send to {so.supplier?.name || "supplier"}
                  </Button>
                </div>
              )}
              {!so.network && ["pending", "sent"].includes(so.status) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {so.supplier?.email && (
                    <Button size="small" loading={busy === so.id} onClick={() => send(so, "email")}>
                      {so.status === "sent" ? "Email again" : "Email order"}
                    </Button>
                  )}
                  {so.whatsappUrl && (
                    <Button size="small" onClick={() => whatsapp(so)}>
                      Send on WhatsApp
                    </Button>
                  )}
                  <Button size="small" type="text" onClick={() => copy(so)}>
                    Copy tracking link
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** The supplier's order page: an order made for another store's buyer. */
export function DropshipForCard({ order }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    apiFetch(`/api/dropship/network/orders/${order.id}`).then((r) => setD(r.dropship)).catch(() => {});
  }, [order.id]);
  if (!d) return null;
  return (
    <Card size="small" title={`Dropship for ${d.seller.name}`}>
      <div className="flex flex-col gap-2 text-[13px]">
        <span>
          Ship to the buyer in the address on this order{d.sellerOrderNumber ? ` (their order #${d.sellerOrderNumber})` : ""}. Don&apos;t put prices or your invoice in the box.
        </span>
        <span className="font-medium">{d.collect > 0 ? `Collect ${formatCurrency(d.collect, order.currency)} cash on delivery. It's on the label when you ship with Oyklane Shipping or a courier app.` : "Prepaid: don't collect cash."}</span>
        <span className="text-ink-muted">
          {d.seller.name} owes you {formatCurrency(d.owed, order.currency)}
          {d.collect > 0 ? `, less the ${formatCurrency(d.collect, order.currency)} your courier collects,` : ""} once it&apos;s delivered (Products ▸ Suppliers ▸ Payments).
        </span>
        {(d.seller.email || d.seller.phone) && <span className="text-ink-muted">Seller: {[d.seller.email, d.seller.phone].filter(Boolean).join(", ")}</span>}
      </div>
    </Card>
  );
}
