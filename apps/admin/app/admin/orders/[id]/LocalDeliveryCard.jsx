"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { App, Button, Card, Input, Select } from "antd";
import { StatusBadge } from "@shopcycle/ui";
import { formatCurrency } from "@/lib/money";
import { apiFetch } from "@/lib/api";

const STATUS = {
  pending: { status: "pending", label: "Awaiting payment" },
  scheduled: { status: "scheduled", label: "Scheduled" },
  out: { status: "shipped", label: "Out for delivery" },
  delivered: { status: "delivered", label: "Delivered" },
  failed: { status: "failed", label: "Not delivered" },
};

/** Order page ▸ Local delivery: the slot, the rider and the delivery's progress. */
export function LocalDeliveryCard({ orderId, currency, cod, cancelled, onChange }) {
  const { message, modal } = App.useApp();
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const [slot, setSlot] = useState();
  const [note, setNote] = useState("");
  const [failing, setFailing] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    apiFetch(`/api/orders/${orderId}/local-delivery`)
      .then((r) => (setD(r.delivery), setNote(r.delivery?.note || "")))
      .catch(() => setD(null));
  }, [orderId]);
  useEffect(load, [load]);
  if (!d) return null;

  async function change(body, done) {
    setBusy(true);
    try {
      const r = await apiFetch(`/api/orders/${orderId}/local-delivery`, { method: "PATCH", body });
      setD(r.delivery);
      setNote(r.delivery?.note || "");
      setSlot(undefined);
      setFailing(false);
      message.success(done);
      onChange?.();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const deliver = () =>
    cod
      ? modal.confirm({
          title: "Mark this order delivered?",
          content: "The rider collected the cash, so the order is marked paid.",
          okText: "Delivered, cash collected",
          onOk: () => change({ status: "delivered", cashCollected: true }, "Marked delivered"),
        })
      : change({ status: "delivered" }, "Marked delivered");

  const open = !cancelled && d.status !== "delivered" && d.status !== "pending";
  return (
    <Card size="small" title="Local delivery" extra={<StatusBadge {...(STATUS[d.status] || { status: d.status })} />}>
      <div className="flex flex-col gap-3 text-[13px]">
        <div>
          <p className="m-0 font-medium text-ink">{d.slotLabel}</p>
          <p className="m-0 text-ink-muted">
            {d.zoneName} · {d.fee > 0 ? formatCurrency(d.fee, currency) : "Free delivery"}
          </p>
          {d.status === "pending" && <p className="m-0 mt-1 text-ink-muted">The slot is held once the order is paid.</p>}
          {d.status === "failed" && d.failedReason && <p className="m-0 mt-1 text-red-600">{d.failedReason}</p>}
        </div>

        {open && (
          <>
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Rider</span>
              <Select
                className="!w-full"
                placeholder={d.riders?.length ? "Assign a rider" : "No riders yet"}
                value={d.riderId || undefined}
                allowClear
                disabled={busy || !d.riders?.length}
                options={(d.riders || []).map((r) => ({ value: r.id, label: r.phone ? `${r.name} · ${r.phone}` : r.name }))}
                onChange={(v) => change({ riderId: v || null }, v ? "Rider assigned" : "Rider removed")}
              />
              {!d.riders?.length && (
                <span className="mt-1 block text-[12px] text-ink-muted">
                  Add riders in <Link href="/admin/settings/shipping">Settings ▸ Shipping</Link>.
                </span>
              )}
            </label>
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Note for the rider</span>
              <Input.TextArea rows={2} maxLength={300} value={note} placeholder="e.g. Call before coming, gate code" onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (d.note || "") && change({ note }, "Note saved")} />
            </label>
            {d.slots?.length > 0 && (
              <label>
                <span className="mb-1 block text-[12px] text-ink-muted">Reschedule</span>
                <div className="flex gap-2">
                  <Select className="!w-full" placeholder="Pick a new slot" value={slot} onChange={setSlot} options={d.slots.map((s) => ({ value: s.value, label: s.label }))} />
                  <Button disabled={!slot || busy} onClick={() => change({ status: "scheduled", slot }, "Delivery rescheduled")}>
                    Move
                  </Button>
                </div>
              </label>
            )}
            {failing ? (
              <div className="flex flex-col gap-2">
                <Input autoFocus value={reason} maxLength={200} placeholder="Why it wasn't delivered" onChange={(e) => setReason(e.target.value)} aria-label="Reason" />
                <div className="flex justify-end gap-2">
                  <Button size="small" onClick={() => setFailing(false)}>
                    Back
                  </Button>
                  <Button size="small" danger type="primary" loading={busy} onClick={() => change({ status: "failed", reason }, "Marked not delivered")}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap justify-end gap-2">
                {d.status !== "failed" && (
                  <Button size="small" danger type="text" disabled={busy} onClick={() => (setFailing(true), setReason(""))}>
                    Not delivered
                  </Button>
                )}
                {d.status !== "out" && (
                  <Button size="small" disabled={busy} onClick={() => change({ status: "out" }, "Out for delivery")}>
                    Out for delivery
                  </Button>
                )}
                <Button size="small" type="primary" disabled={busy} onClick={deliver}>
                  Delivered
                </Button>
              </div>
            )}
          </>
        )}
        {d.status === "delivered" && d.riderName && <p className="m-0 text-ink-muted">Delivered by {d.riderName}.</p>}
      </div>
    </Card>
  );
}
