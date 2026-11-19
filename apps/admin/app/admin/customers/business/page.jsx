"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { App, Button, Input, InputNumber, Modal, Select, Table } from "antd";
import { Briefcase } from "lucide-react";
import { PageHeader, EmptyState, ListCard, StatusBadge } from "@shopcycle/ui";
import { formatCurrency } from "@/lib/money";
import { apiFetch } from "@/lib/api";

const STATUS = { pending: { status: "pending", label: "Waiting for review" }, approved: { status: "active", label: "Approved" }, rejected: { status: "cancelled", label: "Turned down" } };

/** Customers ▸ Business accounts: buyers who applied for business prices and terms. */
export default function BusinessAccountsPage() {
  const { message } = App.useApp();
  const [tab, setTab] = useState("pending");
  const [data, setData] = useState({ accounts: [], counts: {} });
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, l] = await Promise.all([apiFetch(`/api/b2b/accounts${tab === "all" ? "" : `?status=${tab}`}`), apiFetch("/api/b2b/price-lists")]);
      setData(a);
      setLists(l.priceLists || []);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, message]);
  useEffect(() => {
    load();
  }, [load]);

  async function save(body, done) {
    setBusy(true);
    try {
      await apiFetch(`/api/b2b/accounts/${edit.id}`, { method: "PATCH", body });
      message.success(done);
      setEdit(null);
      load();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const c = data.counts || {};
  const tabs = [
    { key: "pending", label: "Waiting for review", count: c.pending || 0 },
    { key: "approved", label: "Approved", count: c.approved || 0 },
    { key: "rejected", label: "Turned down", count: c.rejected || 0 },
    { key: "all", label: "All", count: (c.pending || 0) + (c.approved || 0) + (c.rejected || 0) },
  ];
  const listName = (id) => lists.find((l) => l.id === id)?.name;
  const columns = [
    {
      title: "Business",
      render: (_, a) => (
        <span className="text-[13px]">
          <span className="font-medium text-ink">{a.company}</span>
          <span className="block text-ink-muted">
            {a.customer ? <Link href={`/admin/customers/${a.customer.id}`}>{a.customer.name || a.customer.email}</Link> : "—"}
            {a.gstin ? ` · ${a.gstin}` : ""}
          </span>
          {a.note && <span className="block text-[12px] text-ink-muted">“{a.note}”</span>}
        </span>
      ),
    },
    { title: "Prices", width: 160, render: (_, a) => listName(a.priceListId) || <span className="text-ink-muted">Store prices</span> },
    { title: "Pay later", width: 110, render: (_, a) => (a.netDays > 0 ? `${a.netDays} days` : <span className="text-ink-muted">No</span>) },
    {
      title: "Unpaid",
      width: 150,
      align: "right",
      render: (_, a) =>
        a.owed?.unpaid > 0 ? (
          <span className="text-[13px]">
            {formatCurrency(a.owed.unpaid)}
            {a.owed.overdue > 0 && <span className="block text-[12px] text-red-600">{formatCurrency(a.owed.overdue)} overdue</span>}
          </span>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
    { title: "Status", dataIndex: "status", width: 160, render: (s) => <StatusBadge {...STATUS[s]} /> },
    {
      title: "",
      width: 110,
      align: "right",
      render: (_, a) => (
        <Button size="small" type={a.status === "pending" ? "primary" : "default"} onClick={() => setEdit({ ...a, creditLimit: a.creditLimit ?? null })}>
          {a.status === "pending" ? "Review" : "Edit"}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Business accounts"
        subtitle="Buyers who applied for business prices from their account page. Approve them with a price list and, if you like, pay-later terms."
        actions={
          <Link href="/admin/customers/price-lists">
            <Button>Price lists</Button>
          </Link>
        }
      />
      <ListCard tabs={tabs} activeTab={tab} onTabChange={setTab}>
        {!loading && !data.accounts.length ? (
          <EmptyState icon={<Briefcase size={22} />} title={tab === "pending" ? "No requests waiting" : "No business accounts here"} description="Signed-in shoppers apply from their account page (Business account). Requests show here for you to approve." />
        ) : (
          <Table rowKey="id" size="middle" loading={loading} columns={columns} dataSource={data.accounts} pagination={{ pageSize: 25, hideOnSinglePage: true }} scroll={{ x: 900 }} />
        )}
      </ListCard>

      <Modal
        open={Boolean(edit)}
        title={edit ? edit.company : ""}
        onCancel={() => setEdit(null)}
        footer={
          edit && (
            <div className="flex flex-wrap justify-end gap-2">
              {edit.status !== "rejected" && (
                <Button danger disabled={busy} onClick={() => save({ status: "rejected" }, "Request turned down")}>
                  Turn down
                </Button>
              )}
              <Button type="primary" loading={busy} onClick={() => save({ status: "approved", priceListId: edit.priceListId || null, netDays: edit.netDays || 0, creditLimit: edit.creditLimit, company: edit.company, gstin: edit.gstin || "" }, edit.status === "approved" ? "Saved" : "Approved. The buyer is emailed.")}>
                {edit.status === "approved" ? "Save" : "Approve"}
              </Button>
            </div>
          )
        }
      >
        {edit && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-[12px] text-ink-muted">Business name</span>
              <Input value={edit.company} onChange={(e) => setEdit({ ...edit, company: e.target.value })} />
            </label>
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">GSTIN (goes on their invoices)</span>
              <Input value={edit.gstin || ""} maxLength={15} onChange={(e) => setEdit({ ...edit, gstin: e.target.value.toUpperCase() })} />
            </label>
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Prices</span>
              <Select className="!w-full" value={edit.priceListId || ""} onChange={(priceListId) => setEdit({ ...edit, priceListId })} options={[{ value: "", label: "Store prices" }, ...lists.map((l) => ({ value: l.id, label: l.name }))]} />
            </label>
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Pay later (days after the order, 0 for no)</span>
              <InputNumber className="!w-full" min={0} max={120} value={edit.netDays} onChange={(netDays) => setEdit({ ...edit, netDays: netDays ?? 0 })} />
            </label>
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Credit limit (unpaid at once)</span>
              <InputNumber className="!w-full" min={0} value={edit.creditLimit} placeholder="No limit" onChange={(creditLimit) => setEdit({ ...edit, creditLimit })} />
            </label>
            {!lists.length && (
              <p className="m-0 text-[12px] text-ink-muted sm:col-span-2">
                No price lists yet. <Link href="/admin/customers/price-lists">Create one</Link> to give business prices.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
