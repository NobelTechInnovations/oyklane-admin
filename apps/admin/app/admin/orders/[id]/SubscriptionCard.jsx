"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "antd";
import { StatusBadge } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";

const STATUS = {
  active: { status: "active", label: "Active" },
  paused: { status: "pending", label: "Paused" },
  cancelled: { status: "cancelled", label: "Cancelled" },
};

/** Order page ▸ Subscription: the subscription this order started, or the one it's a delivery of. */
export function SubscriptionCard({ orderId }) {
  const [subs, setSubs] = useState([]);
  useEffect(() => {
    apiFetch(`/api/customer-subscriptions?orderId=${encodeURIComponent(orderId)}&status=all`)
      .then((d) => setSubs(d.subscriptions || []))
      .catch(() => setSubs([]));
  }, [orderId]);
  if (!subs.length) return null;
  return (
    <Card size="small" title={subs.length > 1 ? "Subscriptions" : "Subscription"}>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {subs.map((s) => (
          <li key={s.id} className="text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{s.what}</span>
              <StatusBadge {...(STATUS[s.status] || { status: s.status })} />
            </div>
            <p className="m-0 mt-0.5 text-ink-muted">
              {s.frequencyLabel} · {s.originOrderId === orderId ? "started with this order" : `delivery of a subscription`}
              {s.status === "active" && s.nextLabel ? ` · next ${s.nextLabel}` : ""}
            </p>
            <Link href={`/admin/orders/subscriptions/${s.id}`}>View subscription</Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
