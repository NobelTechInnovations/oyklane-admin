"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, Input, App } from "antd";
import { Repeat, Search } from "lucide-react";
import { PageHeader, EmptyState, ListCard, StatusBadge } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";

const STATUS = {
  active: { status: "active", label: "Active" },
  paused: { status: "pending", label: "Paused" },
  cancelled: { status: "cancelled", label: "Cancelled" },
};

/** Orders ▸ Subscriptions: customers who get a product on repeat
 * (customer-subscriptions/service.js). */
export default function SubscriptionsPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [tab, setTab] = useState("active");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ subscriptions: [], total: 0, counts: {} });
  const [loading, setLoading] = useState(true);
  const pageSize = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), ...(tab !== "all" && { status: tab }), ...(query && { q: query }) });
      setData(await apiFetch(`/api/customer-subscriptions?${params}`));
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, tab, query, message]);
  useEffect(() => {
    load();
  }, [load]);

  const c = data.counts || {};
  const tabs = [
    { key: "active", label: "Active", count: c.active || 0 },
    { key: "paused", label: "Paused", count: c.paused || 0 },
    { key: "cancelled", label: "Cancelled", count: c.cancelled || 0 },
    { key: "all", label: "All", count: (c.active || 0) + (c.paused || 0) + (c.cancelled || 0) },
  ];
  const none = !loading && !query && tabs[3].count === 0;

  const columns = [
    {
      title: "Customer",
      render: (_, s) => (
        <span className="text-[13px]">
          <span className="font-medium text-ink">{s.shipping?.name || s.email}</span>
          <span className="block text-ink-muted">{s.email}</span>
        </span>
      ),
    },
    { title: "Product", dataIndex: "what", render: (v) => <span className="text-[13px]">{v}</span> },
    { title: "How often", dataIndex: "frequencyLabel", width: 140 },
    {
      title: "Next delivery",
      width: 170,
      render: (_, s) => (s.status !== "active" ? <span className="text-ink-muted">—</span> : s.waitingForPayment ? <span className="text-[13px]">Waiting for payment</span> : <span className="text-[13px]">{s.nextLabel}</span>),
    },
    { title: "Deliveries", dataIndex: "ordersCount", width: 100, align: "right" },
    { title: "Payment", dataIndex: "payment", width: 130, render: (v) => <span className="text-[13px]">{v === "cod" ? "Cash on delivery" : "Pay link"}</span> },
    { title: "Status", dataIndex: "status", width: 110, render: (v) => <StatusBadge {...(STATUS[v] || { status: v })} /> },
  ];

  return (
    <div>
      <PageHeader title="Subscriptions" subtitle="Customers who get a product on repeat. Each delivery is placed as a normal order." />
      {none ? (
        <ListCard>
          <EmptyState
            icon={<Repeat size={22} />}
            title="No subscriptions yet"
            description="Open a product and turn on Subscriptions. Shoppers can then pick how often they want it and save on every delivery."
            actionLabel="Go to products"
            onAction={() => router.push("/admin/products")}
          />
        </ListCard>
      ) : (
        <ListCard
          tabs={tabs}
          activeTab={tab}
          onTabChange={(k) => (setTab(k), setPage(1))}
          toolbar={
            <Input
              allowClear
              prefix={<Search size={14} aria-hidden="true" />}
              placeholder="Search by customer, email, phone or product"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (!e.target.value) (setQuery(""), setPage(1));
              }}
              onPressEnter={() => (setQuery(q.trim()), setPage(1))}
              className="!max-w-sm"
              aria-label="Search subscriptions"
            />
          }
        >
          <Table
            rowKey="id"
            size="middle"
            loading={loading}
            columns={columns}
            dataSource={data.subscriptions}
            onRow={(s) => ({ onClick: () => router.push(`/admin/orders/subscriptions/${s.id}`), style: { cursor: "pointer" } })}
            pagination={{ current: page, pageSize, total: data.total, onChange: setPage, showSizeChanger: false, hideOnSinglePage: true }}
            scroll={{ x: 900 }}
            locale={{ emptyText: query ? "No subscriptions match your search." : "None here." }}
          />
        </ListCard>
      )}
      <p className="mt-3 text-[12px] text-ink-muted">
        Set up which products are sold on subscription on each product&apos;s page. <Link href="/admin/products">Products</Link>
      </p>
    </div>
  );
}
