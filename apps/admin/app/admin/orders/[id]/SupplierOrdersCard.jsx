"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, Tag } from "antd";
import { apiFetch } from "@/lib/api";

const STATUS = { pending: ["Not sent", "orange"], sent: ["Sent", "blue"], shipped: ["Shipped", "green"], cancelled: ["Cancelled", "default"] };

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
      if (how === "email") message.success(`Sent to ${so.supplier?.name}`);
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
              {so.trackingNumber && <span className="block text-ink-muted">{[so.courier, so.trackingNumber].filter(Boolean).join(" ")}</span>}
              {["pending", "sent"].includes(so.status) && (
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
