"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { App, Button, Card, Table } from "antd";
import { PageHeader, Thumb } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";

/**
 * Products ▸ Back in stock: how many shoppers asked to hear when each
 * sold-out product is back (the "Notify me" box on its page), how many were
 * told, and how many bought it. Alerts go out by themselves when stock is
 * added; "Send alerts now" sends any that are due.
 */
export default function BackInStockPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    apiFetch("/api/products/stock-alerts")
      .then((d) => setRows(d.alerts))
      .catch((err) => {
        setRows([]);
        message.error(err.message);
      });
  }, [message]);
  useEffect(() => {
    load();
  }, [load]);

  async function sendNow() {
    setBusy(true);
    try {
      const { sent } = await apiFetch("/api/products/stock-alerts/send", { method: "POST", body: {} });
      message.success(sent ? `Sent ${sent} alert${sent === 1 ? "" : "s"}` : "Nothing to send: no product that's back in stock has anyone waiting");
      load();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const waiting = (rows || []).reduce((n, r) => n + r.waiting, 0);
  return (
    <div>
      <PageHeader
        title="Back in stock"
        backHref="/admin/products"
        subtitle={rows ? `${waiting} shopper${waiting === 1 ? "" : "s"} waiting` : " "}
        actions={
          <Button loading={busy} onClick={sendNow}>
            Send alerts now
          </Button>
        }
      />
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table
          size="small"
          rowKey="variantId"
          loading={!rows}
          dataSource={rows || []}
          pagination={{ pageSize: 25, hideOnSinglePage: true }}
          scroll={{ x: 640 }}
          locale={{ emptyText: <div className="py-8 text-[13px] text-ink-muted">No requests yet. When a product sells out, its page offers “Notify me”, and requests show here.</div> }}
          columns={[
            {
              title: "Product",
              key: "product",
              render: (_, r) => (
                <Link href={`/admin/products/${r.productId}`} className="flex items-center gap-2 text-ink hover:text-accent">
                  <Thumb src={r.image} size={36} alt="" />
                  <span>
                    {r.product}
                    {r.variant && <span className="block text-[12px] text-ink-muted">{r.variant}</span>}
                  </span>
                </Link>
              ),
            },
            { title: "In stock", dataIndex: "stock", align: "right", width: 100, render: (n) => (n > 0 ? n : <span className="text-status-danger">0</span>) },
            { title: "Waiting", dataIndex: "waiting", align: "right", width: 100, sorter: (a, b) => a.waiting - b.waiting },
            { title: "Told", dataIndex: "sent", align: "right", width: 90 },
            { title: "Bought", dataIndex: "ordered", align: "right", width: 90, render: (n, r) => (r.sent ? `${n} (${Math.round((n / r.sent) * 100)}%)` : "—") },
          ]}
        />
      </Card>
      <p className="m-0 mt-3 text-[12px] text-ink-muted">Shoppers are emailed once, as soon as the product has stock again. “Bought” counts orders within 7 days of the email.</p>
    </div>
  );
}
