"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import JsBarcode from "jsbarcode";
import { ShippingLabel } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";

function Barcode({ value, height = 64, fontSize = 13 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && value) JsBarcode(ref.current, String(value), { format: "CODE128", height, width: 2, margin: 0, fontSize, textMargin: 2, font: "monospace" });
  }, [value, height, fontSize]);
  return <svg ref={ref} className="max-w-full" />;
}

/**
 * Oyklane Shipping's own 4×6 inch label: the courier's AWB and routing code
 * (from the courier partner) in our layout (@shopcycle/ui ShippingLabel),
 * showing what Super admin ▸ Shipping ▸ Label design turned on — sellers
 * can't change it. Opens from an order's shipment and prints straight away.
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
  return (
    <>
      <style>{`
        @page { size: 4in 6in; margin: 0; }
        html, body { margin: 0; background: #f2f2f2; }
        .oy-lbl { margin: 16px auto; }
        @media print { html, body { background: #fff; } .oy-lbl { margin: 0; border: 0 !important; } .noprint { display: none; } }
      `}</style>
      <ShippingLabel data={d} layout={d.layout} Barcode={Barcode} />
      <p className="noprint" style={{ textAlign: "center", fontFamily: "system-ui", fontSize: 13 }}>
        <button onClick={() => window.print()} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}>
          Print label
        </button>
      </p>
    </>
  );
}
