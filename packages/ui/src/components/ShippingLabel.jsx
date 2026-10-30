import { BrandMark } from "./BrandMark";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** Stand-in barcode (stripes from the text) where no barcode library is loaded — the super admin's preview. */
export function StripeBarcode({ value, height = 64 }) {
  const bars = String(value || "")
    .split("")
    .flatMap((c) => {
      const n = c.charCodeAt(0);
      return [1 + (n % 3), 1 + ((n >> 2) % 2), 1 + ((n >> 1) % 3), 1];
    });
  let x = 0;
  const rects = bars.map((w, i) => {
    const r = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w} height={height - 14} fill="#000" /> : null;
    x += w;
    return r;
  });
  return (
    <svg viewBox={`0 0 ${x} ${height}`} style={{ width: "100%", maxWidth: 260, height }} aria-hidden="true">
      {rects}
      <text x={x / 2} y={height - 2} textAnchor="middle" fontSize="11" fontFamily="monospace">
        {value}
      </text>
    </svg>
  );
}

export const LABEL_CSS = `
  .oy-lbl { width: 4in; height: 6in; box-sizing: border-box; padding: 0.12in; background: #fff; color: #000; font: 10.5px/1.3 Inter, system-ui, sans-serif; display: flex; flex-direction: column; border: 1px solid #000; }
  .oy-lbl * { box-sizing: border-box; }
  .oy-lbl .row { display: flex; border-bottom: 1px solid #000; }
  .oy-lbl .cell { padding: 5px 6px; }
  .oy-lbl .grow { flex: 1; min-width: 0; }
  .oy-lbl .b { font-weight: 700; }
  .oy-lbl .muted { color: #333; }
  .oy-lbl .pay { font-size: 15px; font-weight: 800; text-align: center; padding: 6px; }
  .oy-lbl .center { text-align: center; }
  .oy-lbl .tiny { font-size: 8.5px; }
  .oy-lbl .clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

/**
 * Oyklane Shipping's 4×6 inch label. `data` is the shipment
 * (/shipping/oyklane/shipments/:id/label-data); `layout` is what Super
 * admin ▸ Shipping ▸ Label design turned on; `Barcode` draws a barcode
 * ({ value, height, fontSize }). The same layout prints in the seller's
 * admin and previews in the super admin.
 */
export function ShippingLabel({ data: d, layout = {}, Barcode = StripeBarcode }) {
  const L = { showOyklaneLogo: true, showRoutingCode: true, showCustomerPhone: true, showWeight: true, showDimensions: true, showValue: true, showOrderBarcode: true, showOrderDate: true, showItems: true, maxItems: 6, showReturnAddress: true, showReturnPhone: true, showGstin: true, footer: "Shipped with Oyklane", showPartner: true, ...layout };
  const cod = d.paymentType === "COD";
  const items = d.items || [];
  const max = Number(L.maxItems) || 6;
  const parcel = L.showWeight || L.showDimensions || L.showValue;
  const footer = [L.footer, L.showPartner && d.partner ? `Supported by ${d.partner}` : null].filter(Boolean).join(" · ");
  return (
    <div className="oy-lbl">
      <style>{LABEL_CSS}</style>
      <div className="row" style={{ alignItems: "center" }}>
        <div className="cell grow" style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {L.showOyklaneLogo && <BrandMark size={20} />}
          {L.showStoreName && <span className="b clip" style={{ fontSize: 12 }}>{d.from?.name}</span>}
        </div>
        <div className="cell b" style={{ fontSize: 13, textAlign: "right" }}>{d.courier}</div>
      </div>
      <div className="row">
        <div className="cell grow center" style={{ paddingTop: 8 }}>
          <Barcode value={d.awb} height={62} />
        </div>
        {L.showRoutingCode && d.routingCode && (
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
          {L.showCustomerPhone && d.to.phone && <div>Phone: {d.to.phone}</div>}
        </div>
      </div>
      <div className="row">
        <div className="cell grow pay" style={parcel ? { borderRight: "1px solid #000" } : undefined}>{cod ? `COD ${inr(d.codAmount)}` : "PREPAID"}</div>
        {parcel && (
          <div className="cell" style={{ width: "45%" }}>
            {L.showWeight && (
              <div>
                Weight <span className="b">{(Number(d.weightGrams || 0) / 1000).toFixed(2)} kg</span>
              </div>
            )}
            {L.showDimensions && d.dimensions && (
              <div>
                Size {d.dimensions.lengthCm}×{d.dimensions.widthCm}×{d.dimensions.heightCm} cm
              </div>
            )}
            {L.showValue && <div>Value {inr(d.invoiceValue)}</div>}
          </div>
        )}
      </div>
      <div className="row">
        <div className="cell grow">
          <div className="tiny muted">ORDER</div>
          <div className="b">#{d.orderNumber}</div>
          {L.showOrderDate && <div>{new Date(d.orderDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>}
        </div>
        {L.showOrderBarcode && (
          <div className="cell center" style={{ paddingTop: 6 }}>
            <Barcode value={`#${d.orderNumber}`} height={30} fontSize={10} />
          </div>
        )}
      </div>
      <div className="row grow" style={{ flexDirection: "column", overflow: "hidden" }}>
        {L.showItems && (
          <div className="cell">
            <div className="tiny muted">CONTENTS</div>
            {items.slice(0, max).map((i, k) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                <span className="clip">
                  {i.title}
                  {L.showSku && i.sku ? ` · ${i.sku}` : ""}
                </span>
                <span className="b">×{i.quantity}</span>
              </div>
            ))}
            {items.length > max && <div className="muted">+ {items.length - max} more item{items.length - max === 1 ? "" : "s"}</div>}
          </div>
        )}
        {L.note && <div className="cell b" style={{ marginTop: "auto" }}>{L.note}</div>}
      </div>
      {L.showReturnAddress && (
        <div className="row">
          <div className="cell grow">
            <div className="tiny muted">IF UNDELIVERED, RETURN TO</div>
            <div className="b">{d.from.name}</div>
            <div>
              {[d.from.address1, d.from.address2, d.from.city, d.from.state].filter(Boolean).join(", ")} {d.from.pincode}
            </div>
            <div>
              {L.showReturnPhone && d.from.phone ? `Phone: ${d.from.phone}` : ""}
              {L.showGstin && d.gstin ? `${L.showReturnPhone && d.from.phone ? " · " : ""}GSTIN ${d.gstin}` : ""}
            </div>
          </div>
        </div>
      )}
      {footer && (
        <div className="cell center tiny muted" style={{ paddingBottom: 0 }}>
          {footer}
        </div>
      )}
    </div>
  );
}

/** A made-up shipment for previews. */
export const SAMPLE_LABEL = {
  awb: "1490812345678",
  courier: "Delhivery Surface",
  routingCode: "DEL/OKH",
  orderNumber: 1042,
  orderDate: "2026-10-28T10:00:00.000Z",
  paymentType: "COD",
  codAmount: 1499,
  invoiceValue: 1499,
  weightGrams: 650,
  dimensions: { lengthCm: 25, widthCm: 20, heightCm: 6 },
  to: { name: "Priya Sharma", address1: "Flat 402, Lotus Residency", address2: "Sector 18", city: "Noida", state: "Uttar Pradesh", pincode: "201301", phone: "9800000000" },
  from: { name: "Your Store", address1: "12 Craft Lane", address2: "", city: "Jaipur", state: "Rajasthan", pincode: "302001", phone: "9800000001" },
  items: [
    { title: "Lavender Regal Jacket Lehenga", sku: "LEH-LAV-M", quantity: 1 },
    { title: "Embroidered Potli Bag", sku: "POT-GLD", quantity: 2 },
  ],
  gstin: "08ABCDE1234F1Z5",
  partner: "iThink Logistics",
};
