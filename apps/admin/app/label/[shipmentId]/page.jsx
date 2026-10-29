"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import JsBarcode from "jsbarcode";
import { BrandMark } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function Barcode({ value, height = 64, fontSize = 13 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && value) JsBarcode(ref.current, String(value), { format: "CODE128", height, width: 2, margin: 0, fontSize, textMargin: 2, font: "monospace" });
  }, [value, height, fontSize]);
  return <svg ref={ref} className="max-w-full" />;
}

/**
 * Oyklane Shipping's own 4×6 inch label: the courier's AWB and routing code
 * (from the courier partner) in our layout, with the Oyklane logo.
 * Opens from an order's shipment and prints straight away.
 */
export default function ShippingLabelPage() {
  const { shipmentId } = useParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch(`/api/shipping/oyklane/shipments/${shipmentId}/label-data`)
      .then((r) => {
        setD(r);
        setTimeout(() => window.print(), 400);
      })
      .catch((err) => setError(err.message));
  }, [shipmentId]);

  if (error) return <p style={{ padding: 24, fontFamily: "system-ui" }}>{error}</p>;
  if (!d) return <p style={{ padding: 24, fontFamily: "system-ui" }}>Preparing the label…</p>;
  const cod = d.paymentType === "COD";
  return (
    <>
      <style>{`
        @page { size: 4in 6in; margin: 0; }
        html, body { margin: 0; background: #f2f2f2; }
        .lbl { width: 4in; height: 6in; box-sizing: border-box; margin: 16px auto; padding: 0.12in; background: #fff; color: #000; font: 10.5px/1.3 Inter, system-ui, sans-serif; display: flex; flex-direction: column; border: 1px solid #000; }
        .lbl * { box-sizing: border-box; }
        .row { display: flex; border-bottom: 1px solid #000; }
        .cell { padding: 5px 6px; }
        .grow { flex: 1; min-width: 0; }
        .b { font-weight: 700; }
        .muted { color: #333; }
        .pay { font-size: 15px; font-weight: 800; text-align: center; padding: 6px; }
        .center { text-align: center; }
        .tiny { font-size: 8.5px; }
        @media print { html, body { background: #fff; } .lbl { margin: 0; border: 0; } .noprint { display: none; } }
      `}</style>
      <div className="lbl">
        <div className="row" style={{ alignItems: "center" }}>
          <div className="cell grow">
            <BrandMark size={20} />
          </div>
          <div className="cell b" style={{ fontSize: 13, textAlign: "right" }}>{d.courier}</div>
        </div>
        <div className="row">
          <div className="cell grow center" style={{ paddingTop: 8 }}>
            <Barcode value={d.awb} height={62} />
          </div>
          {d.routingCode && (
            <div className="cell center b" style={{ borderLeft: "1px solid #000", fontSize: 16, display: "flex", alignItems: "center" }}>
              {d.routingCode}
            </div>
          )}
        </div>
        <div className="row">
          <div className="cell grow">
            <div className="tiny muted">DELIVER TO</div>
            <div className="b" style={{ fontSize: 12.5 }}>{d.to.name}</div>
            <div>{[d.to.address1, d.to.address2].filter(Boolean).join(", ")}</div>
            <div>
              {d.to.city}, {d.to.state} <span className="b" style={{ fontSize: 13 }}>{d.to.pincode}</span>
            </div>
            {d.to.phone && <div>Phone: {d.to.phone}</div>}
          </div>
        </div>
        <div className="row">
          <div className="cell grow pay" style={{ borderRight: "1px solid #000" }}>{cod ? `COD ${inr(d.codAmount)}` : "PREPAID"}</div>
          <div className="cell" style={{ width: "45%" }}>
            <div>
              Weight <span className="b">{(d.weightGrams / 1000).toFixed(2)} kg</span>
            </div>
            <div>
              Size {d.dimensions.lengthCm}×{d.dimensions.widthCm}×{d.dimensions.heightCm} cm
            </div>
            <div>Value {inr(d.invoiceValue)}</div>
          </div>
        </div>
        <div className="row">
          <div className="cell grow">
            <div className="tiny muted">ORDER</div>
            <div className="b">#{d.orderNumber}</div>
            <div>{new Date(d.orderDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
          </div>
          <div className="cell center" style={{ paddingTop: 6 }}>
            <Barcode value={`#${d.orderNumber}`} height={30} fontSize={10} />
          </div>
        </div>
        <div className="row grow" style={{ flexDirection: "column", overflow: "hidden" }}>
          <div className="cell">
            <div className="tiny muted">CONTENTS</div>
            {d.items.slice(0, 6).map((i, k) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.title}</span>
                <span className="b">×{i.quantity}</span>
              </div>
            ))}
            {d.items.length > 6 && <div className="muted">+ {d.items.length - 6} more item{d.items.length - 6 === 1 ? "" : "s"}</div>}
          </div>
        </div>
        <div className="row">
          <div className="cell grow">
            <div className="tiny muted">IF UNDELIVERED, RETURN TO</div>
            <div className="b">{d.from.name}</div>
            <div>
              {[d.from.address1, d.from.address2, d.from.city, d.from.state].filter(Boolean).join(", ")} {d.from.pincode}
            </div>
            <div>
              {d.from.phone ? `Phone: ${d.from.phone}` : ""}
              {d.gstin ? ` · GSTIN ${d.gstin}` : ""}
            </div>
          </div>
        </div>
        <div className="cell center tiny muted" style={{ paddingBottom: 0 }}>
          Shipped with Oyklane{d.partner ? ` · Supported by ${d.partner}` : ""}
        </div>
      </div>
      <p className="noprint" style={{ textAlign: "center", fontFamily: "system-ui", fontSize: 13 }}>
        <button onClick={() => window.print()} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}>
          Print label
        </button>
      </p>
    </>
  );
}
