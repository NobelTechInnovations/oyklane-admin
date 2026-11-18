"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Table, Button, Select, Input, Modal, App, Tooltip } from "antd";
import { Bike, ChevronLeft, ChevronRight, Copy, Settings } from "lucide-react";
import { PageHeader, EmptyState, ListCard, StatusBadge } from "@shopcycle/ui";
import { formatCurrency } from "@/lib/money";
import { apiFetch } from "@/lib/api";

const STATUS = {
  scheduled: { status: "scheduled", label: "Scheduled" },
  out: { status: "shipped", label: "Out for delivery" },
  delivered: { status: "delivered", label: "Delivered" },
  failed: { status: "failed", label: "Not delivered" },
  cancelled: { status: "cancelled", label: "Cancelled" },
};
const REASONS = ["Customer not available", "Wrong or incomplete address", "Customer refused the order", "Couldn't reach the customer"];

const shift = (ymd, days) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Orders ▸ Local delivery: the day's deliveries by slot. Assign riders,
 * send them out, and mark each delivered (cash collected) or not delivered. */
export default function LocalDeliveryBoardPage() {
  const { message, modal } = App.useApp();
  const [date, setDate] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rider, setRider] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [failing, setFailing] = useState(null);
  const [reason, setReason] = useState("");
  const [on, setOn] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch(`/api/orders/local-deliveries${date ? `?date=${date}` : ""}`);
      setData(d);
      if (!date) setDate(d.date);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [date, message]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    apiFetch("/api/shipping/local")
      .then((d) => setOn(Boolean(d.settings?.enabled)))
      .catch(() => {});
  }, []);

  const rows = useMemo(() => (data?.deliveries || []).filter((r) => rider === "all" || (rider === "none" ? !r.riderId : r.riderId === rider)), [data, rider]);
  const riders = data?.riders || [];
  const toCollect = rows.filter((r) => r.status !== "delivered" && r.status !== "cancelled").reduce((n, r) => n + (Number(r.collect) || 0), 0);
  const currency = rows[0]?.currency;

  async function change(row, body, done) {
    setBusyId(row.orderId);
    try {
      await apiFetch(`/api/orders/${row.orderId}/local-delivery`, { method: "PATCH", body });
      message.success(done);
      await load();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function deliver(row) {
    if (!(row.collect > 0)) return change(row, { status: "delivered" }, `Order ${row.orderNumber} delivered`);
    modal.confirm({
      title: `Mark order ${row.orderNumber} delivered?`,
      content: `The rider collects ${formatCurrency(row.collect, row.currency)} in cash. The order is marked paid.`,
      okText: "Delivered, cash collected",
      onOk: () => change(row, { status: "delivered", cashCollected: true }, `Order ${row.orderNumber} delivered`),
    });
  }

  function copyList() {
    const text = rows
      .filter((r) => r.status !== "cancelled" && r.status !== "delivered")
      .map((r) => [`#${r.orderNumber} · ${r.windowLabel}`, [r.customer, r.phone].filter(Boolean).join(", "), r.address, r.items, r.collect > 0 ? `Collect ${formatCurrency(r.collect, r.currency)}` : "Paid"].filter(Boolean).join("\n"))
      .join("\n\n");
    if (!text) return message.info("Nothing left to deliver on this day.");
    navigator.clipboard.writeText(`${data.dayLabel}\n\n${text}`).then(
      () => message.success("Delivery list copied. Paste it in a message to your rider."),
      () => message.error("Couldn't copy. Select the rows and copy them instead."),
    );
  }

  const columns = [
    { title: "Slot", dataIndex: "windowLabel", width: 130, render: (v, r) => <span className="text-[13px] text-ink">{v}<span className="block text-[12px] text-ink-muted">{r.zone}</span></span> },
    { title: "Order", dataIndex: "orderNumber", width: 90, render: (v, r) => <Link href={`/admin/orders/${r.orderId}`}>#{v}</Link> },
    {
      title: "Deliver to",
      render: (_, r) => (
        <div className="text-[13px]">
          <span className="font-medium text-ink">{r.customer || "—"}</span>
          {r.phone && <span className="text-ink-muted"> · {r.phone}</span>}
          <span className="block text-ink-muted">{r.address}</span>
          <span className="block text-[12px] text-ink-muted">{r.items}</span>
          {r.note && <span className="block text-[12px] text-ink">Note: {r.note}</span>}
          {r.status === "failed" && r.failedReason && <span className="block text-[12px] text-red-600">{r.failedReason}</span>}
        </div>
      ),
    },
    { title: "Collect", dataIndex: "collect", width: 110, align: "right", render: (v, r) => (v > 0 ? <span className="font-medium">{formatCurrency(v, r.currency)}</span> : <span className="text-ink-muted">Paid</span>) },
    {
      title: "Rider",
      width: 170,
      render: (_, r) => (
        <Select
          size="small"
          className="!w-full"
          placeholder={riders.length ? "Assign" : "Add riders in Settings"}
          value={r.riderId || undefined}
          allowClear
          disabled={!riders.length || r.status === "delivered" || r.status === "cancelled" || busyId === r.orderId}
          options={riders.map((x) => ({ value: x.id, label: x.name }))}
          onChange={(v) => change(r, { riderId: v || null }, v ? "Rider assigned" : "Rider removed")}
          aria-label={`Rider for order ${r.orderNumber}`}
        />
      ),
    },
    { title: "Status", dataIndex: "status", width: 140, render: (v) => <StatusBadge {...(STATUS[v] || { status: v })} /> },
    {
      title: "",
      width: 230,
      align: "right",
      render: (_, r) => {
        if (r.status === "delivered" || r.status === "cancelled") return null;
        const busy = busyId === r.orderId;
        return (
          <div className="flex justify-end gap-1.5">
            {r.status !== "out" && (
              <Button size="small" disabled={busy} onClick={() => change(r, { status: "out" }, `Order ${r.orderNumber} is out for delivery`)}>
                Out for delivery
              </Button>
            )}
            <Button size="small" type="primary" disabled={busy} onClick={() => deliver(r)}>
              Delivered
            </Button>
            {r.status !== "failed" && (
              <Button size="small" danger type="text" disabled={busy} onClick={() => (setFailing(r), setReason(""))}>
                Not delivered
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Local delivery"
        subtitle="Orders your own riders deliver, by slot."
        actions={
          <Link href="/admin/settings/shipping">
            <Button icon={<Settings size={14} />}>Delivery settings</Button>
          </Link>
        }
      />
      <ListCard
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Tooltip title="Previous day">
                <Button size="small" icon={<ChevronLeft size={14} />} aria-label="Previous day" disabled={!date} onClick={() => setDate(shift(date, -1))} />
              </Tooltip>
              <Input type="date" size="small" className="!w-40" value={date} aria-label="Delivery date" onChange={(e) => e.target.value && setDate(e.target.value)} />
              <Tooltip title="Next day">
                <Button size="small" icon={<ChevronRight size={14} />} aria-label="Next day" disabled={!date} onClick={() => setDate(shift(date, 1))} />
              </Tooltip>
              {data?.dayLabel && <span className="ml-2 text-[13px] font-medium text-ink">{data.dayLabel}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {toCollect > 0 && <span className="text-[13px] text-ink-muted">Cash to collect: <b className="text-ink">{formatCurrency(toCollect, currency)}</b></span>}
              <Select
                size="small"
                className="!w-44"
                value={rider}
                onChange={setRider}
                aria-label="Show rider"
                options={[{ value: "all", label: "All riders" }, { value: "none", label: "No rider yet" }, ...riders.map((x) => ({ value: x.id, label: x.name }))]}
              />
              <Button size="small" icon={<Copy size={14} />} onClick={copyList} disabled={!rows.length}>
                Copy list
              </Button>
            </div>
          </div>
        }
      >
        {!loading && !rows.length ? (
          <EmptyState
            icon={<Bike size={22} />}
            title={on ? "No local deliveries on this day" : "Local delivery is off"}
            description={on ? "Orders to your delivery zones show up here, in the slot the shopper picked." : "Turn it on in Settings ▸ Shipping, add your zones and riders, and shoppers nearby can pick a delivery slot at checkout."}
            actionLabel={on ? undefined : "Set up local delivery"}
            onAction={on ? undefined : () => (window.location.href = "/admin/settings/shipping")}
          />
        ) : (
          <Table rowKey="orderId" size="middle" loading={loading} columns={columns} dataSource={rows} pagination={false} scroll={{ x: 1000 }} />
        )}
      </ListCard>

      <Modal
        open={Boolean(failing)}
        title={failing ? `Order ${failing.orderNumber} wasn't delivered` : ""}
        okText="Save"
        okButtonProps={{ danger: true, loading: busyId === failing?.orderId }}
        onCancel={() => setFailing(null)}
        onOk={async () => {
          await change(failing, { status: "failed", reason }, `Order ${failing.orderNumber} marked not delivered`);
          setFailing(null);
        }}
      >
        <p className="m-0 mb-2 text-[13px] text-ink-muted">What happened? You can reschedule it from the order page.</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {REASONS.map((x) => (
            <Button key={x} size="small" type={reason === x ? "primary" : "default"} onClick={() => setReason(x)}>
              {x}
            </Button>
          ))}
        </div>
        <Input value={reason} maxLength={200} placeholder="Or write the reason" onChange={(e) => setReason(e.target.value)} aria-label="Reason" />
      </Modal>
    </div>
  );
}
