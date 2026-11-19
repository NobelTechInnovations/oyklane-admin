"use client";

import { useEffect, useState } from "react";
import { Card, Tag } from "antd";
import { apiFetch } from "@/lib/api";

/** Order page: where it ships from (Settings ▸ Locations) and pay-later terms (business accounts). */
export function OrderExtrasCard({ order }) {
  const [allocation, setAllocation] = useState([]);
  const [terms, setTerms] = useState(null);
  useEffect(() => {
    apiFetch(`/api/orders/${order.id}/allocation`).then((d) => setAllocation(d.allocation || [])).catch(() => {});
    if (order.paymentMethod === "net_terms") apiFetch(`/api/b2b/orders/${order.id}/terms`).then((d) => setTerms(d.terms)).catch(() => {});
  }, [order.id, order.paymentMethod]);
  if (!allocation.length && !terms) return null;

  const places = new Map();
  for (const a of allocation) {
    const p = places.get(a.location.id) || { ...a.location, items: [] };
    const item = (order.items || []).find((i) => i.id === a.orderItemId);
    p.items.push(`${a.quantity} × ${item?.title || "item"}`);
    places.set(a.location.id, p);
  }
  const paid = order.paymentStatus === "paid";
  return (
    <Card size="small" title={allocation.length ? "Ships from" : "Payment terms"}>
      <div className="flex flex-col gap-3 text-[13px]">
        {[...places.values()].map((p) => (
          <div key={p.id}>
            <span className="font-medium">{p.name}</span>
            {p.address && <span className="block text-ink-muted">{p.address}</span>}
            <span className="block text-ink-muted">{p.items.join(", ")}</span>
          </div>
        ))}
        {terms && (
          <div className={allocation.length ? "border-t border-line pt-3" : ""}>
            <span className="font-medium">Pay later, {terms.netDays} days</span>{" "}
            {paid ? <Tag color="green">Paid</Tag> : terms.overdue ? <Tag color="red">Overdue</Tag> : <Tag>Due</Tag>}
            <span className="block text-ink-muted">Due {new Date(terms.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
