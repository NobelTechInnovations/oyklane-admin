"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Form, Input, Switch } from "antd";
import { apiFetch } from "@/lib/api";

/**
 * Product form ▸ Pre-orders (Product.preorder): keep selling when stock
 * runs out and ship later, with the date shoppers see. Also how many
 * shoppers are waiting for it to be back in stock.
 */
export function PreorderCard({ productId }) {
  const enabled = Form.useWatch(["preorder", "enabled"]);
  const [waiting, setWaiting] = useState(0);
  useEffect(() => {
    if (!productId) return;
    apiFetch(`/api/products/${productId}/stock-alerts`)
      .then((d) => setWaiting(d.waiting || 0))
      .catch(() => {});
  }, [productId]);
  return (
    <Card size="small" title="Pre-orders">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-sm font-medium">Keep selling when it&apos;s out of stock</p>
          <p className="m-0 mt-0.5 text-[13px] text-ink-muted">Shoppers can pre-order at 0 stock. The button says “Pre-order”, and their order shows when it ships.</p>
        </div>
        <Form.Item name={["preorder", "enabled"]} valuePropName="checked" className="!mb-0">
          <Switch aria-label="Keep selling when it's out of stock" />
        </Form.Item>
      </div>
      {enabled && (
        <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
          <Form.Item name={["preorder", "shipsOn"]} label="Ships by" className="!mb-0" normalize={(v) => v || null}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name={["preorder", "note"]} label="Note to shoppers (optional)" className="!mb-0">
            <Input maxLength={160} placeholder="e.g. Freshly made to order; dispatched in the first week of December" />
          </Form.Item>
        </div>
      )}
      {waiting > 0 && (
        <p className="m-0 mt-3 text-[13px]">
          {waiting} shopper{waiting === 1 ? " is" : "s are"} waiting for it to be back in stock.{" "}
          <Link href="/admin/products/back-in-stock" className="text-accent">
            See back in stock
          </Link>
        </p>
      )}
    </Card>
  );
}
