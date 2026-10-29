"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { App, Alert, Button, InputNumber, Modal, Radio, Tag } from "antd";
import { Download, Truck, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useApps } from "@/lib/apps";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const STATUS = { booked: ["Sent — choose a courier", "default"], assigned: ["Booked", "blue"], in_transit: ["In transit", "gold"], delivered: ["Delivered", "green"], rto: ["Returning", "red"], cancelled: ["Cancelled", "default"] };
const COURIER_APPS = ["shiprocket"];

/** The courier apps this store has installed (Fulfillment menu entries). */
export function useCourierApps() {
  const { installed } = useApps();
  return installed.filter((a) => COURIER_APPS.includes(a.key));
}

/** "Ship with Shiprocket": its couriers and prices, book, then label and
 * tracking. Opened from the order's Fulfillment menu. */
export function ShipWithCourierApp({ app, order, open, onClose, onBooked }) {
  const { message } = App.useApp();
  const [quote, setQuote] = useState(null);
  const [parcel, setParcel] = useState({});
  const [choice, setChoice] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  async function getRates(p = parcel) {
    setBusy("rates");
    setError(null);
    try {
      const q = await apiFetch(`/api/courier-apps/${app.key}/orders/${order.id}/rates`, { method: "POST", body: p });
      setQuote(q);
      setParcel(q.parcel);
      setChoice(q.couriers[0]?.courierId || null);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }

  async function book() {
    const c = quote.couriers.find((x) => x.courierId === choice);
    if (!c) return;
    setBusy("book");
    try {
      const { shipment } = await apiFetch(`/api/courier-apps/${app.key}/orders/${order.id}/book`, { method: "POST", body: { ...parcel, courierId: c.courierId, courierName: c.name, price: c.price } });
      message.success(`Booked with ${shipment.courier} — AWB ${shipment.awb}`);
      onClose?.();
      onBooked?.();
    } catch (err) {
      message.error(err.message);
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

  return (
    <>
      <Modal open={open} onCancel={onClose} title={`Ship with ${app.name}`} width={620} footer={null} destroyOnHidden>
        {error && (
          <Alert
            type={error.details?.reason === "not_connected" ? "info" : "error"}
            showIcon
            className="mb-4"
            message={error.message}
            action={error.details?.reason === "not_connected" ? <Link href={`/admin/apps/couriers/${app.key}`}>Connect</Link> : null}
          />
        )}
        {quote && (
          <>
            <div className="flex flex-wrap items-end gap-3 mb-4">
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
            <p className="text-[12.5px] text-ink-muted mt-0 mb-2">
              From {quote.pickup.name} ({quote.pickup.pincode}). {quote.paymentType === "COD" ? `Cash on delivery ${inr(quote.codAmount)} — ${app.name} collects it and pays you.` : "Prepaid order."} {app.name} bills you for shipping.
            </p>
            {quote.couriers.length === 0 ? (
              <Alert type="warning" showIcon message="No courier serves this pincode right now." />
            ) : (
              <Radio.Group value={choice} onChange={(e) => setChoice(e.target.value)} style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                {quote.couriers.map((c, i) => (
                  <Radio
                    key={c.courierId}
                    value={c.courierId}
                    style={{ display: "flex", alignItems: "center", margin: 0, width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${choice === c.courierId ? "#1F5FD6" : "#E5E7EB"}`, background: choice === c.courierId ? "#F0F5FD" : "#fff" }}
                  >
                    <span className="flex w-full items-center justify-between gap-3">
                      <span>
                        <span className="text-[13.5px] font-medium text-ink">{c.name}</span>
                        {i === 0 && <Tag color="green" className="!ml-2 !text-[10.5px]">Cheapest</Tag>}
                        <span className="block text-[12px] text-ink-muted">{c.etaDays ? `Delivers in about ${c.etaDays} day${Number(c.etaDays) === 1 ? "" : "s"}` : c.eta ? `Expected ${c.eta}` : "Standard delivery"}</span>
                      </span>
                      <span className="text-[15px] font-semibold tabular-nums text-ink">{inr(c.price)}</span>
                    </span>
                  </Radio>
                ))}
              </Radio.Group>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <Button onClick={onClose}>Cancel</Button>
              <Button type="primary" icon={<Truck size={15} aria-hidden="true" />} disabled={!choice} loading={busy === "book"} onClick={book}>
                Book courier
              </Button>
            </div>
          </>
        )}
        {!quote && !error && <p className="text-sm text-ink-muted">Asking {app.name} for couriers…</p>}
      </Modal>
    </>
  );
}

/** This order's Shiprocket / iThink parcels: status, label, cancel. */
export function CourierAppShipments({ orderId, onChange }) {
  const { message, modal } = App.useApp();
  const [rows, setRows] = useState([]);
  const load = () =>
    apiFetch(`/api/courier-apps/orders/${orderId}/shipments`)
      .then((d) => setRows(d.shipments || []))
      .catch(() => {});
  useEffect(() => {
    load();
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function label(s) {
    try {
      const { url } = await apiFetch(`/api/courier-apps/shipments/${s.id}/label`);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      message.error(err.message);
    }
  }

  function cancel(s) {
    modal.confirm({
      title: "Cancel this shipment?",
      content: `The booking is cancelled with ${s.appName}.`,
      okText: "Cancel shipment",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await apiFetch(`/api/courier-apps/shipments/${s.id}/cancel`, { method: "POST" });
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
        const [label_, color] = STATUS[s.status] || [s.status, "default"];
        return (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-app-border px-3 py-2.5">
            <div className="min-w-0">
              <p className="m-0 text-[13.5px] font-medium text-ink">
                {s.appName} · {s.courier || "Courier"} <Tag color={color} className="!ml-1">{label_}</Tag>
              </p>
              <p className="m-0 text-[12px] text-ink-muted">
                AWB {s.awb || "—"}
                {s.paymentType === "COD" ? ` · COD ${inr(s.codAmount)}` : ""}
                {s.partnerStatus ? ` · ${s.partnerStatus}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              {s.awb && s.status !== "cancelled" && (
                <Button size="small" icon={<Download size={13} aria-hidden="true" />} onClick={() => label(s)}>
                  Label
                </Button>
              )}
              {s.status === "assigned" && (
                <Button size="small" danger type="text" icon={<XCircle size={13} aria-hidden="true" />} onClick={() => cancel(s)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
