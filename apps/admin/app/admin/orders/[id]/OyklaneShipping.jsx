"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { App, Alert, Button, Dropdown, InputNumber, Modal, Radio, Select, Tag } from "antd";
import { Download, FileText, MoreHorizontal, PackageCheck, Printer, Truck, Wallet, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { NdrDialog } from "@/components/shipping/NdrDialog";
import { AddMoneyDialog } from "@/components/shipping/ShippingWallet";
import { PriceParts } from "@/components/shipping/PriceParts";

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
  const [pickupId, setPickupId] = useState(null);
  const [adding, setAdding] = useState(false);

  async function getRates(p = {}, from = pickupId) {
    setBusy("rates");
    setError(null);
    try {
      const q = await apiFetch(`/api/shipping/oyklane/orders/${order.id}/rates`, { method: "POST", body: { ...p, ...(from && { pickupId: from }) } });
      setQuote(q);
      setParcel(q.parcel);
      setPickupId(q.pickupId || null);
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
      getRates({}, null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function book() {
    const c = quote.couriers.find((x) => x.courierId === choice);
    if (!c) return;
    setBusy("book");
    try {
      const { shipment } = await apiFetch(`/api/shipping/oyklane/orders/${order.id}/book`, { method: "POST", body: { courierId: c.courierId, ...parcel, ...(pickupId && { pickupId }) } });
      message.success(`Booked with ${shipment.courier} — AWB ${shipment.awb}`);
      onClose?.();
      onBooked?.();
    } catch (err) {
      if (err.details?.reason === "wallet_low") setAdding(true);
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  const reason = error?.details?.reason;
  const wallet = quote?.wallet?.enabled ? quote.wallet : null;
  const picked = quote?.couriers.find((x) => x.courierId === choice);
  const short = wallet && picked ? Math.max(0, picked.price - wallet.balance) : 0;
  return (
    <Modal open={open} onCancel={onClose} title="Ship with Oyklane Shipping" width={620} footer={null} destroyOnHidden>
      {error && (
        <Alert
          type={reason === "no_pickup" || reason === "pickup_pending" ? "info" : "error"}
          showIcon
          className="mb-4"
          message={error.message}
          action={reason === "no_pickup" ? <Link href="/admin/settings/shipping#pickups">Add pickup address</Link> : null}
        />
      )}
      {quote && (
        <>
          {quote.pickups?.length > 1 && (
            <label className="mb-3 block text-[12.5px] text-ink-muted">
              Ship from
              <Select
                className="!mt-1 !block !w-full"
                value={pickupId}
                disabled={busy === "rates"}
                onChange={(id) => getRates(parcel, id)}
                options={quote.pickups.map((p) => ({ value: p.id, label: `${p.label} — ${p.city ? `${p.city}, ` : ""}${p.pincode}` }))}
              />
            </label>
          )}
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
            {quote.paymentType === "COD" ? `Cash on delivery ${inr(quote.codAmount)} — collected by Oyklane and paid to your bank after delivery.` : "Prepaid order."} {wallet ? "Shipping is paid from your wallet." : "Shipping is billed with your plan."}
          </p>
          {wallet && (
            <div className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border px-3 py-2 ${short > 0 ? "border-[#F5D08A] bg-[#FFF8EB]" : "border-app-border bg-app-surface"}`}>
              <span className="inline-flex items-center gap-2 text-[13px] text-ink">
                <Wallet size={15} aria-hidden="true" /> Wallet balance <b className="tabular-nums">{inr(wallet.balance)}</b>
                {short > 0 && <span className="text-[#B45309]">· add {inr(short)} more for this courier</span>}
              </span>
              <Button size="small" type={short > 0 ? "primary" : "default"} onClick={() => setAdding(true)}>
                Add money
              </Button>
            </div>
          )}
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
                    <span className="text-right">
                      <span className="block text-[15px] font-semibold tabular-nums text-ink">{inr(c.price)}</span>
                      {c.breakdown && <span className="block text-[11px] text-ink-muted">incl. fuel surcharge &amp; GST</span>}
                    </span>
                  </span>
                  {choice === c.courierId && c.breakdown && <PriceParts b={c.breakdown} className="mt-2 max-w-[340px]" />}
                </Radio>
              ))}
            </Radio.Group>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" icon={<Truck size={15} aria-hidden="true" />} disabled={!choice || short > 0} loading={busy === "book"} onClick={book}>
              Book courier{picked ? ` · ${inr(picked.price)}` : ""}
            </Button>
          </div>
          {wallet && <AddMoneyDialog open={adding} onClose={() => setAdding(false)} minTopup={wallet.minTopup} suggest={short} onAdded={(balance) => setQuote((q) => ({ ...q, wallet: { ...q.wallet, balance } }))} />}
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
      content: "The courier booking is cancelled and its shipping charge is refunded — to your shipping wallet, or off your bill.",
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
                AWB {s.awb} · {inr(s.freight)} shipping + GST{s.paymentType === "COD" ? ` · COD ${inr(s.codAmount)}` : ""}
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
