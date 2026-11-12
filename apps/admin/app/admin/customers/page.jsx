"use client";

import { isPhoneOnlyEmail } from "@/lib/customers";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, Input, Button, Modal, Form, App } from "antd";
import { Plus, Users, Search, Download } from "lucide-react";
import { PageHeader, EmptyState, ListCard, SearchInput } from "@shopcycle/ui";
import { formatCurrency } from "@shopcycle/utils";
import { apiFetch, apiDownload } from "@/lib/api";
import { initials } from "@/lib/storefront";
import { useColumnChoice } from "@/components/ColumnPicker";

// Columns the seller can turn on or off ("Columns", remembered per browser).
const CUSTOMER_COLUMNS = [
  { key: "phone", label: "Phone", default: false },
  { key: "email", label: "Email", default: false },
  { key: "location", label: "Location" },
  { key: "orders", label: "Orders" },
  { key: "spent", label: "Amount spent" },
  { key: "consent", label: "Agreed to offers", default: false },
  { key: "tags", label: "Tags", default: false },
  { key: "verified", label: "Phone verified", default: false },
  { key: "lastSignIn", label: "Last signed in", default: false },
  { key: "joined", label: "Customer since", default: false },
];
const shortDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default function CustomersPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [selected, setSelected] = useState([]);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (q) params.set("q", q);
      const data = await apiFetch(`/api/customers?${params.toString()}`);
      setCustomers(data.customers);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(values) {
    setSaving(true);
    try {
      await apiFetch("/api/customers", { method: "POST", body: values });
      message.success(`${values.name} added`);
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const { picker, pick } = useColumnChoice("oy:customers:columns", CUSTOMER_COLUMNS);
  const columns = pick([
    {
      title: "Customer",
      dataIndex: "name",
      render: (name, row) => (
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-full bg-app-bg border border-app-border text-ink-muted text-xs font-semibold flex items-center justify-center shrink-0">
            {initials(name)}
          </span>
          <div className="min-w-0">
            <Link
              href={`/admin/customers/${row.id}`}
              className="font-medium text-ink hover:underline block truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {name}
            </Link>
            <span className="text-xs text-ink-muted block truncate">{isPhoneOnlyEmail(row.email) ? row.phone || "Phone sign-in" : row.email}</span>
          </div>
        </div>
      ),
    },
    { choice: "phone", title: "Phone", width: 140, render: (_, row) => <span className="tabular-nums">{row.phone || "—"}</span> },
    { choice: "email", title: "Email", width: 220, render: (_, row) => (isPhoneOnlyEmail(row.email) ? "—" : row.email) },
    {
      choice: "location",
      title: "Location",
      responsive: ["md"],
      width: 180,
      render: (_, row) => (
        <span className="text-[13px] text-ink-muted">{[row.city, row.province].filter(Boolean).join(", ") || "—"}</span>
      ),
    },
    {
      choice: "orders",
      title: "Orders",
      responsive: ["sm"],
      dataIndex: "orderCount",
      width: 100,
      align: "right",
      render: (n) => <span className="tabular-nums">{n}</span>,
    },
    {
      choice: "spent",
      title: "Amount spent",
      width: 150,
      align: "right",
      render: (_, row) => <span className="font-medium tabular-nums">{formatCurrency(row.totalSpent)}</span>,
    },
    {
      choice: "consent",
      title: "Agreed to offers",
      width: 170,
      render: (_, row) => <span className="text-[13px]">{[row.acceptsWhatsappMarketing && "WhatsApp", row.acceptsEmailMarketing && "Email", row.acceptsSmsMarketing && "SMS"].filter(Boolean).join(", ") || "—"}</span>,
    },
    { choice: "tags", title: "Tags", width: 180, render: (_, row) => <span className="text-[13px]">{row.tags || "—"}</span> },
    { choice: "verified", title: "Phone verified", width: 130, render: (_, row) => (row.phoneVerifiedAt ? "Yes" : "—") },
    { choice: "lastSignIn", title: "Last signed in", width: 140, render: (_, row) => <span className="text-[13px]">{shortDate(row.lastSignInAt)}</span> },
    { choice: "joined", title: "Customer since", width: 140, render: (_, row) => <span className="text-[13px]">{shortDate(row.createdAt)}</span> },
  ]);

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={loading ? " " : `${total} ${total === 1 ? "customer" : "customers"}${q ? " match" : ""}`}
        actions={
          <>
            <Button
              icon={<Download size={15} aria-hidden="true" />}
              onClick={() => apiDownload("/api/data/exports/customers", "customers.csv").catch((err) => message.error(err.message))}
            >
              Export
            </Button>
            <Button type="primary" icon={<Plus size={15} aria-hidden="true" />} onClick={() => setModalOpen(true)}>
              Add customer
            </Button>
          </>
        }
      />

      <ListCard
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2">
            <SearchInput
              placeholder="Search name, email or phone"
              onSearch={(v) => {
                setPage(1);
                setQ(v);
              }}
            />
            <span className="ml-auto">{picker}</span>
          </div>
        }
      >
        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-app-border bg-accent-soft/60" role="region" aria-label="Bulk actions">
            <span className="text-sm font-medium text-ink mr-1 tabular-nums">{selected.length} selected</span>
            <Button size="small" type="primary" disabled={selected.length > 200} onClick={() => router.push(`/admin/customers/bulk-edit?ids=${selected.join(",")}`)}>
              Bulk edit
            </Button>
            <Button size="small" type="text" className="ml-auto" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        )}
        <Table
          rowKey="id"
          scroll={{ x: "max-content" }}
          loading={loading}
          rowSelection={{
            selectedRowKeys: selected,
            onChange: setSelected,
            preserveSelectedRowKeys: true,
            columnWidth: 44,
            getCheckboxProps: () => ({ onClick: (e) => e.stopPropagation() }),
          }}
          columns={columns}
          dataSource={customers}
          rowClassName="oy-row-link"
          onRow={(row) => ({ onClick: () => router.push(`/admin/customers/${row.id}`) })}
          pagination={total > pageSize && { current: page, pageSize, total, onChange: setPage, showSizeChanger: false }}
          locale={{
            emptyText: q ? (
              <EmptyState icon={<Search />} title="No customers match" description="Try a different name or email." />
            ) : (
              <EmptyState
                icon={<Users />}
                title="No customers yet"
                description="Customers appear here automatically when they place an order. You can also add one yourself."
                actionLabel="Add customer"
                onAction={() => setModalOpen(true)}
              />
            ),
          }}
        />
      </ListCard>

      <Modal
        title="Add customer"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Add customer"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form layout="vertical" form={form} onFinish={handleCreate} requiredMark={false} className="mt-4">
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Name is required" }]}>
            <Input autoFocus />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Enter a valid email" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input inputMode="tel" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
