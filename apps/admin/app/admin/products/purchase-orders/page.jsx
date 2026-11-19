"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, Card, Segmented, Table, Tag } from "antd";
import { Plus } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { formatCurrency } from "@/lib/money";
import { apiFetch } from "@/lib/api";
import { PO_STATUS } from "./status";


/** Products ▸ Purchase orders: stock bought from vendors, and receiving it. */
export default function PurchaseOrdersPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [status, setStatus] = useState("open");
  const [rows, setRows] = useState(null);
  useEffect(() => {
    setRows(null);
    apiFetch(`/api/purchase-orders?status=${status}`)
      .then((d) => setRows(d.purchaseOrders))
      .catch((err) => (message.error(err.message), setRows([])));
  }, [status, message]);

  return (
    <div>
      <PageHeader
        title="Purchase orders"
        subtitle="Order stock from your vendors and receive it. Receiving adds the stock and updates each product's cost."
        backHref="/admin/products"
        actions={
          <span className="inline-flex gap-2">
            <Button href="/admin/products/labels">Barcode labels</Button>
            <Button type="primary" icon={<Plus size={14} />} onClick={() => router.push("/admin/products/purchase-orders/new")}>
              New purchase order
            </Button>
          </span>
        }
      />
      <div className="mb-3">
        <Segmented value={status} onChange={setStatus} options={[{ value: "open", label: "Open" }, { value: "draft", label: "Drafts" }, { value: "received", label: "Received" }, { value: "all", label: "All" }]} />
      </div>
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          size="middle"
          loading={!rows}
          dataSource={rows || []}
          pagination={{ pageSize: 25, hideOnSinglePage: true }}
          scroll={{ x: 760 }}
          onRow={(po) => ({ onClick: () => router.push(`/admin/products/purchase-orders/${po.id}`), className: "cursor-pointer" })}
          locale={{ emptyText: status === "open" ? "No stock on order. Create a purchase order when you buy from a vendor." : "Nothing here" }}
          columns={[
            {
              title: "Order",
              render: (_, po) => (
                <Link href={`/admin/products/purchase-orders/${po.id}`} className="text-[13px] font-medium text-ink hover:underline" onClick={(e) => e.stopPropagation()}>
                  {po.name}
                </Link>
              ),
              width: 110,
            },
            { title: "Vendor", dataIndex: "vendor" },
            { title: "Status", dataIndex: "status", width: 150, render: (s) => <Tag color={PO_STATUS[s]?.[1]}>{PO_STATUS[s]?.[0] || s}</Tag> },
            { title: "Expected", dataIndex: "expectedAt", width: 120, render: (d) => (d ? new Date(d).toLocaleDateString([], { day: "numeric", month: "short" }) : "—") },
            { title: "Received", width: 110, align: "right", render: (_, po) => `${po.receivedUnits} of ${po.units}` },
            { title: "Total", dataIndex: "total", width: 130, align: "right", render: (v) => formatCurrency(v) },
          ]}
        />
      </Card>
    </div>
  );
}
