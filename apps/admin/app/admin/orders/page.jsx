"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, Button, App, Tooltip } from "antd";
import { Plus, ShoppingCart, Search, Download } from "lucide-react";
import { PageHeader, StatusBadge, EmptyState, ListCard, SearchInput } from "@shopcycle/ui";
import { formatCurrency } from "@shopcycle/utils";
import { apiFetch, apiDownload } from "@/lib/api";
import { useColumnChoice } from "@/components/ColumnPicker";

const TABS = [
  { key: "all", label: "All" },
  { key: "unfulfilled", label: "Unfulfilled" },
  { key: "unpaid", label: "Unpaid" },
  { key: "fulfilled", label: "Fulfilled" },
  { key: "cancelled", label: "Cancelled" },
];

/** "Today, 4:12 pm" / "Yesterday, 9:03 am" / "12 Sep, 2:40 pm" — how a
 * merchant scans an order list, instead of a bare date. */
function orderDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const dayDiff = Math.floor((new Date(now.toDateString()) - new Date(d.toDateString())) / 86_400_000);
  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Yesterday, ${time}`;
  const sameYear = d.getFullYear() === now.getFullYear();
  return `${d.toLocaleDateString(undefined, { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) })}, ${time}`;
}

// Columns the seller can turn on or off ("Columns", remembered per browser).
const ORDER_COLUMNS = [
  { key: "date", label: "Date" },
  { key: "customer", label: "Customer" },
  { key: "phone", label: "Phone", default: false },
  { key: "shipTo", label: "Ship to", default: false },
  { key: "items", label: "Items" },
  { key: "payment", label: "Payment" },
  { key: "method", label: "Payment method", default: false },
  { key: "fulfillment", label: "Fulfillment" },
  { key: "discount", label: "Discount code", default: false },
  { key: "channel", label: "Checkout", default: false },
  { key: "invoice", label: "Invoice no.", default: false },
  { key: "total", label: "Total" },
];
const METHOD = { cod: "Cash on delivery", razorpay: "Razorpay", upi: "UPI", manual: "Manual", gift_card: "Gift card", partial_cod: "Part COD" };

export default function OrdersPage({ searchParams }) {
  // /admin/orders?status=unfulfilled — the Home page's to-do links.
  const wanted = use(searchParams)?.status;
  const router = useRouter();
  const { message } = App.useApp();
  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    setExporting(true);
    try {
      await apiDownload("/api/data/exports/orders", "orders.csv");
    } catch (err) {
      message.error(err.message);
    } finally {
      setExporting(false);
    }
  }
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(TABS.some((t) => t.key === wanted) ? wanted : "all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, page: String(page), pageSize: String(pageSize) });
      if (q) params.set("q", q);
      const data = await apiFetch(`/api/orders?${params.toString()}`);
      setOrders(data.orders);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [status, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  const { picker, pick } = useColumnChoice("oy:orders:columns", ORDER_COLUMNS);
  const dash = <span className="text-ink-subtle">—</span>;
  const columns = pick([
    {
      title: "Order",
      dataIndex: "orderNumber",
      width: 110,
      render: (n, row) => (
        <Link href={`/admin/orders/${row.id}`} className="font-semibold text-ink hover:underline" onClick={(e) => e.stopPropagation()}>
          #{n}
        </Link>
      ),
    },
    {
      choice: "date",
      title: "Date",
      responsive: ["lg"],
      dataIndex: "createdAt",
      width: 170,
      render: (d) => <span className="text-[13px] text-ink-muted">{orderDate(d)}</span>,
    },
    {
      choice: "customer",
      title: "Customer",
      render: (_, row) =>
        row.customer ? (
          <div className="min-w-0">
            <div className="text-ink truncate">{row.customer.name}</div>
            <div className="text-xs text-ink-muted truncate">{row.customer.email}</div>
          </div>
        ) : (
          <span className="text-ink-muted">Guest</span>
        ),
    },
    { choice: "phone", title: "Phone", width: 140, render: (_, row) => <span className="tabular-nums">{row.phone || row.customer?.phone || "—"}</span> },
    { choice: "shipTo", title: "Ship to", width: 180, render: (_, row) => <span className="text-[13px]">{[row.shippingCity, row.shippingProvince].filter(Boolean).join(", ") || "—"}</span> },
    {
      choice: "items",
      title: "Items",
      width: 110,
      render: (_, row) => {
        const units = (row.items || []).reduce((t, i) => t + (i.quantity || 0), 0);
        if (!row.items?.length) return dash;
        return (
          <Tooltip
            placement="bottomLeft"
            title={
              <ul className="m-0 list-none p-0 text-[12.5px] leading-relaxed">
                {row.items.map((i, k) => (
                  <li key={k}>
                    {i.quantity} × {i.title}
                  </li>
                ))}
                {row._count?.items > row.items.length && <li>+{row._count.items - row.items.length} more</li>}
              </ul>
            }
          >
            <span className="cursor-default whitespace-nowrap underline decoration-dotted underline-offset-4" onClick={(e) => e.stopPropagation()}>
              {units} item{units === 1 ? "" : "s"}
            </span>
          </Tooltip>
        );
      },
    },
    { choice: "payment", title: "Payment", responsive: ["md"], dataIndex: "paymentStatus", width: 130, render: (s) => <StatusBadge status={s} /> },
    { choice: "method", title: "Payment method", width: 150, render: (_, row) => <span className="text-[13px]">{METHOD[row.paymentMethod] || row.paymentMethod || "—"}</span> },
    { choice: "fulfillment", title: "Fulfillment", responsive: ["sm"], dataIndex: "fulfillmentStatus", width: 140, render: (s) => <StatusBadge status={s} /> },
    { choice: "discount", title: "Discount code", width: 140, render: (_, row) => (row.discountCode ? <span className="font-mono text-[12.5px]">{row.discountCode}</span> : dash) },
    { choice: "channel", title: "Checkout", width: 120, render: (_, row) => <span className="text-[13px]">{row.oneClickCheckout ? "One-Click" : "Standard"}</span> },
    { choice: "invoice", title: "Invoice no.", width: 140, render: (_, row) => row.invoiceNumber || dash },
    {
      choice: "total",
      title: "Total",
      dataIndex: "total",
      width: 130,
      align: "right",
      render: (v) => <span className="font-medium tabular-nums">{formatCurrency(v)}</span>,
    },
  ]);

  const filtered = Boolean(q) || status !== "all";

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={loading ? " " : `${total} ${total === 1 ? "order" : "orders"}${filtered ? " match" : ""}`}
        actions={
          <>
            <Button icon={<Download size={15} aria-hidden="true" />} loading={exporting} onClick={exportCsv}>
              Export
            </Button>
            <Link href="/admin/orders/new">
              <Button type="primary" icon={<Plus size={15} aria-hidden="true" />}>
                Create order
              </Button>
            </Link>
          </>
        }
      />

      <ListCard
        tabs={TABS}
        activeTab={status}
        onTabChange={(key) => {
          setPage(1);
          setStatus(key);
        }}
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2">
            <SearchInput
              placeholder="Order # or customer"
              onSearch={(v) => {
                setPage(1);
                setQ(v);
              }}
            />
            <span className="ml-auto">{picker}</span>
          </div>
        }
      >
        <Table
          rowKey="id"
          scroll={{ x: "max-content" }}
          loading={loading}
          columns={columns}
          dataSource={orders}
          rowClassName="oy-row-link"
          onRow={(row) => ({ onClick: () => router.push(`/admin/orders/${row.id}`) })}
          pagination={total > pageSize && { current: page, pageSize, total, onChange: setPage, showSizeChanger: false }}
          locale={{
            emptyText: filtered ? (
              <EmptyState icon={<Search />} title="No orders match" description="Try a different search or another tab." />
            ) : (
              <EmptyState
                icon={<ShoppingCart />}
                title="No orders yet"
                description="Orders placed on your storefront show up here. You can also create one by hand for a phone or in-person sale."
                actionLabel="Create order"
                onAction={() => router.push("/admin/orders/new")}
              />
            ),
          }}
        />
      </ListCard>
    </div>
  );
}
