"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { App, Alert, Button, Card, Input, Segmented, Skeleton, Table, Tag } from "antd";
import { FileStack, Printer, Search } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { NdrDialog } from "@/components/shipping/NdrDialog";
import { SHIP_STATUS } from "../orders/[id]/OyklaneShipping";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const day = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—");
const TABS = [
  ["all", "All"],
  ["pickup", "Waiting for pickup"],
  ["transit", "In transit"],
  ["ndr", "Action needed"],
  ["delivered", "Delivered"],
  ["rto", "Returning"],
  ["cancelled", "Cancelled"],
];

/** Shipping ▸ Shipments: every Oyklane Shipping parcel — where it is,
 * what needs a decision (failed deliveries), labels and the manifest for
 * the courier's pickup. */
export default function ShipmentsPage() {
  const { message } = App.useApp();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [picked, setPicked] = useState([]);
  const [ndr, setNdr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch(`/api/shipping/oyklane/shipments?tab=${tab}&page=${page}&q=${encodeURIComponent(q)}`));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [tab, page, q]);
  useEffect(() => {
    load();
  }, [load]);

  async function manifest() {
    setBusy(true);
    try {
      const { url } = await apiFetch("/api/shipping/oyklane/manifest", { method: "POST", body: { ids: picked } });
      if (url) window.open(url, "_blank", "noopener");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const c = data?.counts || {};
  const s = data?.stats || {};
  return (
    <div>
      <PageHeader
        title="Shipments"
        subtitle="Oyklane Shipping parcels: pickup, tracking, failed deliveries and returns."
        actions={
          <div className="flex gap-2">
            <Link href="/admin/shipping/rates">
              <Button>Shipping rates</Button>
            </Link>
            <Link href="/admin/settings/shipping">
              <Button>Settings</Button>
            </Link>
          </div>
        }
      />
      {error && <Alert type="error" showIcon className="!mb-4" message={error} />}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Shipped this month", s.thisMonth ?? "—"],
          ["Shipping this month", s.freightThisMonth != null ? inr(s.freightThisMonth) : "—"],
          ["Delivered", s.deliveredRate != null ? `${s.deliveredRate}%` : "—"],
          ["Returned (RTO)", s.rtoRate != null ? `${s.rtoRate}%` : "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[14px] border border-app-border bg-app-surface px-4 py-3 shadow-card">
            <p className="m-0 text-[12.5px] text-ink-muted">{label}</p>
            <p className="m-0 mt-0.5 text-[20px] font-semibold tabular-nums text-ink">{value}</p>
          </div>
        ))}
      </div>
      {c.ndr > 0 && tab !== "ndr" && (
        <Alert
          type="warning"
          showIcon
          className="!mb-4"
          message={`${c.ndr} parcel${c.ndr === 1 ? "" : "s"} couldn't be delivered — choose re-attempt or return.`}
          action={
            <Button size="small" onClick={() => (setTab("ndr"), setPage(1))}>
              Review
            </Button>
          }
        />
      )}
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-3 py-2.5">
          <Segmented
            value={tab}
            onChange={(v) => (setTab(v), setPage(1), setPicked([]))}
            options={TABS.map(([k, label]) => ({ value: k, label: c[k] ? `${label} ${c[k]}` : label }))}
            className="max-w-full overflow-x-auto"
          />
          <div className="flex items-center gap-2">
            <Input allowClear prefix={<Search size={14} aria-hidden="true" />} placeholder="Order #, AWB or name" className="!w-56" onPressEnter={(e) => (setQ(e.target.value), setPage(1))} onChange={(e) => !e.target.value && (setQ(""), setPage(1))} />
            <Button icon={<FileStack size={14} aria-hidden="true" />} disabled={!picked.length} loading={busy} onClick={manifest}>
              Manifest{picked.length ? ` (${picked.length})` : ""}
            </Button>
          </div>
        </div>
        {!data ? (
          <div className="p-4">
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : (
          <Table
            rowKey="id"
            dataSource={data.shipments}
            size="small"
            scroll={{ x: 960 }}
            rowSelection={{ selectedRowKeys: picked, onChange: setPicked, getCheckboxProps: (r) => ({ disabled: r.status !== "assigned" }) }}
            pagination={{ current: page, pageSize: 25, total: data.total, onChange: setPage, hideOnSinglePage: true, showSizeChanger: false }}
            locale={{ emptyText: tab === "ndr" ? "Nothing needs a decision." : "No shipments here yet. Book one from an order's Fulfillment menu." }}
            columns={[
              { title: "Order", dataIndex: "orderNumber", render: (n, r) => <Link href={`/admin/orders/${r.orderId}`}>#{n}</Link> },
              { title: "Customer", dataIndex: "customer", render: (v, r) => <span>{v || "—"}<span className="block text-[12px] text-ink-muted">{r.city}</span></span> },
              { title: "Courier · AWB", render: (_, r) => <span>{r.courier}<span className="block font-mono text-[12px] text-ink-muted">{r.awb}</span></span> },
              {
                title: "Status",
                render: (_, r) => {
                  const [label, color] = SHIP_STATUS[r.status] || [r.status, "default"];
                  return (
                    <span>
                      <Tag color={color} className="!m-0">{label}</Tag>
                      {r.partnerStatus && <span className="block max-w-[260px] truncate text-[12px] text-ink-muted" title={r.partnerStatus}>{r.partnerStatus}</span>}
                    </span>
                  );
                },
              },
              { title: "Payment", render: (_, r) => (r.paymentType === "COD" ? `COD ${inr(r.codAmount)}` : "Prepaid") },
              { title: "Shipping", dataIndex: "freight", align: "right", render: inr },
              { title: "Booked", dataIndex: "createdAt", render: day },
              {
                title: "",
                align: "right",
                render: (_, r) => (
                  <span className="inline-flex gap-1">
                    {r.status === "ndr" && (
                      <Button size="small" type="primary" danger onClick={() => setNdr(r)}>
                        Decide
                      </Button>
                    )}
                    {r.status !== "cancelled" && <Button size="small" icon={<Printer size={13} aria-hidden="true" />} aria-label="Print label" onClick={() => window.open(`/label/${r.id}`, "_blank", "noopener")} />}
                  </span>
                ),
              },
            ]}
          />
        )}
      </Card>
      <NdrDialog shipment={ndr} open={Boolean(ndr)} onClose={() => setNdr(null)} onDone={load} />
    </div>
  );
}
