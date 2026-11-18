"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { App, Alert, Button, Card, Input, InputNumber, Modal, Select, Table } from "antd";
import { PageHeader, StatusBadge } from "@shopcycle/ui";
import { formatCurrency } from "@/lib/money";
import { apiFetch } from "@/lib/api";

const STATUS = {
  active: { status: "active", label: "Active" },
  paused: { status: "pending", label: "Paused" },
  cancelled: { status: "cancelled", label: "Cancelled" },
};
const FREQUENCIES = ["1-week", "2-week", "3-week", "4-week", "1-month", "2-month", "3-month", "6-month"];
const freqLabel = (v) => {
  const [n, unit] = v.split("-");
  return Number(n) === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`;
};
const dateText = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

/** One subscription: what's next, its orders, and the changes the store can make. */
export default function SubscriptionPage({ params }) {
  const { id } = use(params);
  const { message, modal } = App.useApp();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [qty, setQty] = useState(1);
  const [date, setDate] = useState("");
  const [addrOpen, setAddrOpen] = useState(false);
  const [addr, setAddr] = useState({});
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    apiFetch(`/api/customer-subscriptions/${id}`)
      .then((d) => (setS(d.subscription), setQty(d.subscription.quantity)))
      .catch((err) => message.error(err.message));
  }, [id, message]);
  useEffect(load, [load]);

  async function change(body, done) {
    setBusy(true);
    try {
      const d = await apiFetch(`/api/customer-subscriptions/${id}`, { method: "PATCH", body });
      setS(d.subscription);
      setQty(d.subscription.quantity);
      message.success(done);
      return true;
    } catch (err) {
      message.error(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!s) return <PageHeader title="Subscription" backHref="/admin/orders/subscriptions" />;
  const live = s.status !== "cancelled";
  const freqs = FREQUENCIES.includes(s.frequency) ? FREQUENCIES : [s.frequency, ...FREQUENCIES];

  return (
    <div>
      <PageHeader
        title={s.what}
        backHref="/admin/orders/subscriptions"
        meta={<StatusBadge {...(STATUS[s.status] || { status: s.status })} />}
        actions={
          live && (
            <div className="flex gap-2">
              {s.status === "active" ? (
                <>
                  <Button disabled={busy || s.waitingForPayment} onClick={() => change({ action: "skip" }, "Next delivery skipped")}>
                    Skip next delivery
                  </Button>
                  <Button disabled={busy} onClick={() => change({ action: "pause" }, "Subscription paused")}>
                    Pause
                  </Button>
                </>
              ) : (
                <Button type="primary" disabled={busy} onClick={() => change({ action: "resume" }, "Subscription resumed")}>
                  Resume
                </Button>
              )}
              <Button danger disabled={busy} onClick={() => (setReason(""), setCancelOpen(true))}>
                Cancel subscription
              </Button>
            </div>
          )
        }
      />

      {s.lastError && live && <Alert className="!mb-4" type="warning" showIcon message="The last delivery couldn't be placed" description={`${s.lastError}. It's tried again the next day, and skipped after three tries.`} />}
      {s.waitingForPayment && <Alert className="!mb-4" type="info" showIcon message="This delivery is waiting for the customer to pay" description="They got a link to pay for it. If it isn't paid within 5 days, this delivery is skipped and the next one goes ahead." />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card size="small" title="Schedule">
            <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-3">
              <div>
                <dt className="text-ink-muted">Next delivery</dt>
                <dd className="m-0 font-medium">{s.status === "active" ? (s.waitingForPayment ? "Waiting for payment" : s.nextLabel) : s.status === "paused" ? "Paused" : "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">How often</dt>
                <dd className="m-0 font-medium">{s.frequencyLabel}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Deliveries so far</dt>
                <dd className="m-0 font-medium">{s.ordersCount}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Payment</dt>
                <dd className="m-0 font-medium">{s.payment === "cod" ? "Cash on delivery (placed automatically)" : "Pay link for each delivery"}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Started</dt>
                <dd className="m-0 font-medium">{dateText(s.createdAt)}</dd>
              </div>
              {s.status === "cancelled" && (
                <div>
                  <dt className="text-ink-muted">Cancelled</dt>
                  <dd className="m-0 font-medium">
                    {dateText(s.cancelledAt)}
                    {s.cancelReason ? ` · ${s.cancelReason}` : ""}
                  </dd>
                </div>
              )}
            </dl>
            {live && (
              <div className="mt-5 grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-3">
                <label>
                  <span className="mb-1 block text-[12px] text-ink-muted">How often</span>
                  <Select className="!w-full" value={s.frequency} disabled={busy} options={freqs.map((v) => ({ value: v, label: freqLabel(v) }))} onChange={(v) => change({ action: "frequency", frequency: v }, "Frequency changed")} />
                </label>
                <label>
                  <span className="mb-1 block text-[12px] text-ink-muted">Quantity per delivery</span>
                  <div className="flex gap-2">
                    <InputNumber className="!w-full" min={1} max={99} value={qty} onChange={(v) => setQty(v || 1)} />
                    <Button disabled={busy || qty === s.quantity} onClick={() => change({ action: "quantity", quantity: qty }, "Quantity changed")}>
                      Save
                    </Button>
                  </div>
                </label>
                {s.status === "active" && !s.waitingForPayment && (
                  <label>
                    <span className="mb-1 block text-[12px] text-ink-muted">Move the next delivery to</span>
                    <div className="flex gap-2">
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Next delivery date" />
                      <Button disabled={busy || !date} onClick={async () => (await change({ action: "date", date }, "Next delivery moved")) && setDate("")}>
                        Move
                      </Button>
                    </div>
                  </label>
                )}
              </div>
            )}
          </Card>

          <Card size="small" title="Orders">
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={s.orders || []}
              columns={[
                { title: "Order", dataIndex: "orderNumber", render: (v, o) => <Link href={`/admin/orders/${o.id}`}>#{v}</Link> },
                { title: "Date", dataIndex: "createdAt", render: dateText },
                { title: "Total", dataIndex: "total", align: "right", render: (v, o) => formatCurrency(Number(v), o.currency) },
                { title: "Payment", dataIndex: "paymentStatus", render: (v) => <StatusBadge status={v} /> },
                { title: "Status", render: (_, o) => <StatusBadge status={o.cancelledAt ? "cancelled" : o.fulfillmentStatus} /> },
              ]}
            />
          </Card>
        </div>

        <Card
          size="small"
          title="Customer"
          extra={
            live && (
              <Button size="small" type="link" onClick={() => (setAddr({ ...s.shipping, phone: s.phone || "" }), setAddrOpen(true))}>
                Edit address
              </Button>
            )
          }
        >
          <div className="flex flex-col gap-1 text-[13px]">
            <span className="font-medium">{s.shipping?.name}</span>
            <span>{s.email}</span>
            {s.phone && <span>{s.phone}</span>}
            <span className="mt-2 text-ink-muted">{s.fulfillment === "pickup" ? "Collects from your store" : s.address}</span>
            {s.customerId && (
              <Link className="mt-2" href={`/admin/customers/${s.customerId}`}>
                View customer
              </Link>
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={cancelOpen}
        title="Cancel this subscription?"
        okText="Cancel subscription"
        okButtonProps={{ danger: true, loading: busy }}
        cancelText="Keep it"
        onCancel={() => setCancelOpen(false)}
        onOk={async () => (await change({ action: "cancel", reason }, "Subscription cancelled")) && setCancelOpen(false)}
      >
        <p className="m-0 mb-2 text-[13px] text-ink-muted">No more deliveries are placed. Orders already placed aren&apos;t affected. The customer is emailed.</p>
        <Input value={reason} maxLength={200} placeholder="Reason (optional)" onChange={(e) => setReason(e.target.value)} aria-label="Reason" />
      </Modal>

      <Modal
        open={addrOpen}
        title="Delivery address for this subscription"
        okText="Save address"
        okButtonProps={{ loading: busy }}
        onCancel={() => setAddrOpen(false)}
        onOk={async () => (await change({ action: "address", address: addr }, "Address saved")) && setAddrOpen(false)}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            ["name", "Name"],
            ["phone", "Phone"],
            ["address1", "Address"],
            ["address2", "Apartment, landmark (optional)"],
            ["city", "City"],
            ["province", "State"],
            ["zip", "PIN code"],
          ].map(([k, l]) => (
            <label key={k} className={k === "address1" ? "sm:col-span-2" : ""}>
              <span className="mb-1 block text-[12px] text-ink-muted">{l}</span>
              <Input value={addr[k] || ""} onChange={(e) => setAddr({ ...addr, [k]: e.target.value })} />
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
