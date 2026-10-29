"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { App, Alert, Button, Dropdown, InputNumber, Modal, Radio, Tag } from "antd";
import { Download, FileText, MoreHorizontal, PackageCheck, Printer, Truck, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { NdrDialog } from "@/components/shipping/NdrDialog";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const SHIP_STATUS = {
  assigned: ["Waiting for pickup", "blue"],
  in_transit: ["In transit", "gold"],
  ndr: ["Delivery failed", "red"],
  delivered: ["Delivered", "green"],
  rto: ["Returning to you", "volcano"],
  cancelled: ["Cancelled", "default"],
  booked: ["Sent, no courier yet", "default"],
};

/** "Ship with Oyklane Shipping": every courier for this order with its
 * price (from the products' packages), one click to book — AWB, pickup,
 * tracking. Opened from the order's Fulfillment menu. */
export function ShipWithOyklane({ order, open, onClose, onBooked }) {
  const { message } = App.useApp();
  const [quote, setQuote] = useState(null);
  const [parcel, setParcel] = useState({});
  const [choice, setChoice] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  async function getRates(p = {}) {
    setBusy("rates");
    setError(null);
    try {
      const q = await apiFetch(`/api/shipping/oyklane/orders/${order.id}/rates`, { method: "POST", body: p });
      setQuote(q);
      setParcel(q.parcel);
      setChoice(q.couriers[0]?.courierId || null);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }
  useEffect(() => {
    if (open) {
      setQuote(null);
      getRates({});
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function book() {
    const c = quote.couriers.find((x) => x.courierId === choice);
    if (!c) return;
    setBusy("book");
    try {
      const { shipment } = await apiFetch(`/api/shipping/oyklane/orders/${order.id}/book`, { method: "POST", body: { courierId: c.courierId, ...parcel } });
      message.success(`Booked with ${shipment.courier} — AWB ${shipment.awb}`);
      onClose?.();
      onBooked?.();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  const reason = error?.details?.reason;
  return (
    <Modal open={open} onCancel={onClose} title="Ship with Oyklane Shipping" width={620} footer={null} destroyOnHidden>
      {error && (
        <Alert
          type={reason === "no_pickup" || reason === "pickup_pending" ? "info" : "error"}
          showIcon
          className="mb-4"
          message={error.message}
          action={reason === "no_pickup" ? <Link href="/admin/settings/shipping">Add pickup address</Link> : null}
        />
      )}
      {quote && (
        <>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <label className="text-[12.5px] text-ink-muted">
              Weight (g)
              <InputNumber className="!block !w-28" min={50} max={50000} value={parcel.weightGrams} onChange={(v) => setParcel((p) => ({ ...p, weightGrams: v }))} />
            </label>
            {["lengthCm", "widthCm", "heightCm"].map((k) => (
              <label key={k} className="text-[12.5px] text-ink-muted">
                {k === "lengthCm" ? "L" : k === "widthCm" ? "W" : "H"} (cm)
                <InputNumber className="!block !w-20" min={1} max={200} value={parcel[k]} onChange={(v) => setParcel((p) => ({ ...p, [k]: v }))} />
              </label>
            ))}
            <Button loading={busy === "rates"} onClick={() => getRates(parcel)}>
              Update prices
            </Button>
          </div>
          <p className="mt-0 mb-3 text-[12.5px] text-ink-muted">
            {quote.parcel?.packages?.length ? `Package: ${quote.parcel.packages.join(", ")}. ` : ""}
            {quote.paymentType === "COD" ? `Cash on delivery ${inr(quote.codAmount)} — collected by Oyklane and paid to your bank after delivery.` : "Prepaid order."} Shipping is billed with your plan.
          </p>
          {quote.couriers.length === 0 ? (
            <Alert type="warning" showIcon message="No courier serves this pincode right now." />
          ) : (
            <Radio.Group value={choice} onChange={(e) => setChoice(e.target.value)} className="!flex !w-full !flex-col !gap-2">
              {quote.couriers.map((c, i) => (
                <Radio
                  key={c.courierId}
                  value={c.courierId}
                  className="!m-0 !flex !w-full !items-center rounded-[10px] border px-3 py-2.5"
                  style={{ borderColor: choice === c.courierId ? "#1F5FD6" : "#E5E7EB", background: choice === c.courierId ? "#F0F5FD" : "#fff" }}
                >
                  <span className="flex w-full items-center justify-between gap-3">
                    <span>
                      <span className="text-[13.5px] font-medium text-ink">{c.name}</span>
                      {i === 0 && <Tag color="green" className="!ml-2 !text-[10.5px]">Cheapest</Tag>}
                      <span className="block text-[12px] text-ink-muted">
                        {c.etaDays ? `Delivers in about ${c.etaDays} day${Number(c.etaDays) === 1 ? "" : "s"}` : c.eta ? `Expected ${c.eta}` : "Standard delivery"}
                        {c.zone ? ` · zone ${c.zone}` : ""}
                      </span>
                    </span>
                    <span className="text-[15px] font-semibold tabular-nums text-ink">{inr(c.price)}</span>
                  </span>
                </Radio>
              ))}
            </Radio.Group>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" icon={<Truck size={15} aria-hidden="true" />} disabled={!choice} loading={busy === "book"} onClick={book}>
              Book courier
            </Button>
          </div>
        </>
      )}
      {!quote && !error && <p className="text-sm text-ink-muted">Finding couriers for this pincode…</p>}
    </Modal>
  );
}

/** This order's Oyklane Shipping parcels: status, labels, cancel, NDR. */
export function OyklaneShipments({ orderId, onChange }) {
  const { message, modal } = App.useApp();
  const [rows, setRows] = useState([]);
  const [ndr, setNdr] = useState(null);
  const load = () =>
    apiFetch(`/api/shipping/oyklane/orders/${orderId}`)
      .then((d) => setRows(d.shipments || []))
      .catch(() => {});
  useEffect(() => {
    load();
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function courierLabel(s, size) {
    try {
      const { url } = await apiFetch(`/api/shipping/oyklane/shipments/${s.id}/label?size=${size}`);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      message.error(err.message);
    }
  }

  function cancel(s) {
    modal.confirm({
      title: "Cancel this shipment?",
      content: "The courier booking is cancelled and the shipping charge comes off your bill.",
      okText: "Cancel shipment",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await apiFetch(`/api/shipping/oyklane/shipments/${s.id}/cancel`, { method: "POST" });
          message.success("Shipment cancelled");
          load();
          onChange?.();
        } catch (err) {
          message.error(err.message);
        }
      },
    });
  }

  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {rows.map((s) => {
        const [label, color] = SHIP_STATUS[s.status] || [s.status, "default"];
        return (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-app-border bg-app-surface px-3 py-2.5">
            <div className="min-w-0">
              <p className="m-0 flex flex-wrap items-center gap-1.5 text-[13.5px] font-medium text-ink">
                <PackageCheck size={14} aria-hidden="true" /> Oyklane Shipping · {s.courier || "Courier"} <Tag color={color} className="!m-0">{label}</Tag>
              </p>
              <p className="m-0 text-[12px] text-ink-muted">
                AWB {s.awb} · {inr(s.freight)} shipping{s.paymentType === "COD" ? ` · COD ${inr(s.codAmount)}` : ""}
                {s.partnerStatus ? ` · ${s.partnerStatus}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {s.status === "ndr" && (
                <Button size="small" type="primary" danger onClick={() => setNdr(s)}>
                  Decide
                </Button>
              )}
              {s.status !== "cancelled" && (
                <Button size="small" icon={<Printer size={13} aria-hidden="true" />} onClick={() => window.open(`/label/${s.id}`, "_blank", "noopener")}>
                  Label
                </Button>
              )}
              <Dropdown
                trigger={["click"]}
                placement="bottomRight"
                menu={{
                  items: [
                    { key: "a4", icon: <FileText size={14} aria-hidden="true" />, label: "Courier's label (A4)", onClick: () => courierLabel(s, "A4") },
                    { key: "a6", icon: <Download size={14} aria-hidden="true" />, label: "Courier's label (4×6)", onClick: () => courierLabel(s, "A6") },
                    ...(s.status === "assigned" ? [{ type: "divider" }, { key: "cancel", danger: true, icon: <XCircle size={14} aria-hidden="true" />, label: "Cancel shipment", onClick: () => cancel(s) }] : []),
                  ],
                }}
              >
                <Button size="small" type="text" icon={<MoreHorizontal size={15} aria-hidden="true" />} aria-label="More shipment actions" />
              </Dropdown>
            </div>
          </div>
        );
      })}
      <NdrDialog
        shipment={ndr}
        open={Boolean(ndr)}
        onClose={() => setNdr(null)}
        onDone={() => {
          load();
          onChange?.();
        }}
      />
    </div>
  );
}
