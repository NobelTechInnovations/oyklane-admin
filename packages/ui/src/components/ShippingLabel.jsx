import { BrandMark } from "./BrandMark";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** Stand-in barcode (stripes from the text) where no barcode library is loaded — the super admin's preview. */
export function StripeBarcode({ value, height = 64, fontSize = 11 }) {
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
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 260 }}>
      <svg viewBox={`0 0 ${x} ${height - 14}`} preserveAspectRatio="none" style={{ width: "100%", height: height - (fontSize > 0 ? 14 : 0) }} aria-hidden="true">
        {rects}
      </svg>
      {fontSize > 0 && <span style={{ font: `${fontSize}px monospace` }}>{value}</span>}
    </span>
  );
}

export const LABEL_CSS = `
  .oy-lbl { width: 4in; height: 6in; box-sizing: border-box; padding: 0.1in; background: #fff; color: #000; font: 10px/1.25 Inter, "Helvetica Neue", Arial, sans-serif; display: flex; flex-direction: column; }
  .oy-lbl * { box-sizing: border-box; }
  .oy-lbl .box { border: 1.5px solid #000; display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .oy-lbl .row { display: flex; border-bottom: 1.5px solid #000; min-height: 0; }
  .oy-lbl .row:last-child { border-bottom: 0; }
  .oy-lbl .cell { padding: 4px 6px; min-width: 0; }
  .oy-lbl .vr { border-right: 1.5px solid #000; }
  .oy-lbl .grow { flex: 1; min-width: 0; }
  .oy-lbl .b { font-weight: 800; }
  .oy-lbl .up { text-transform: uppercase; letter-spacing: 0.02em; }
  .oy-lbl .k { font-size: 8px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  .oy-lbl .clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .oy-lbl .big { font-size: 15px; font-weight: 900; line-height: 1.05; }
  .oy-lbl .huge { font-size: 26px; font-weight: 900; line-height: 1; }
  .oy-lbl .center { text-align: center; }
  .oy-lbl .vbar { position: relative; width: 100%; height: 100%; min-height: 1.9in; overflow: hidden; }
  .oy-lbl .vbar__in { position: absolute; left: 50%; top: 50%; width: 2.1in; transform: translate(-50%, -50%) rotate(-90deg); }
  .oy-lbl .vtext { writing-mode: vertical-rl; transform: rotate(180deg); font-weight: 800; font-size: 11px; letter-spacing: 0.04em; white-space: nowrap; }
  .oy-lbl table { width: 100%; border-collapse: collapse; }
  .oy-lbl th { font-size: 8.5px; text-align: left; padding: 2px 6px; border-bottom: 1px solid #000; }
  .oy-lbl td { padding: 2px 6px; vertical-align: top; }
  .oy-lbl .tear { margin-top: 5px; border-top: 1.5px dashed #000; padding-top: 5px; }
`;

const serviceOf = (courier) => (/\bair\b|express|priority/i.test(String(courier || "")) ? "AIR" : "SURFACE");
const shortDate = (d) => {
  const t = new Date(d);
  return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")} hrs, ${String(t.getDate()).padStart(2, "0")}/${String(t.getMonth() + 1).padStart(2, "0")}/${String(t.getFullYear()).slice(-2)}`;
};

/**
 * Oyklane Shipping's 4×6 inch label, laid out like the big couriers' own:
 * a header strip (courier, service, payment, routing code), the AWB as a
 * tall barcode beside the delivery address, who it's sold by (with
 * GSTIN), what's inside, and a tear-off strip. `data` is the shipment
 * (/shipping/oyklane/shipments/:id/label-data); `layout` is what Super
 * admin ▸ Shipping ▸ Label design turned on; `Barcode` draws a barcode
 * ({ value, height, fontSize }). The same layout prints in the seller's
 * admin and previews in the super admin.
 */
export function ShippingLabel({ data: d, layout = {}, Barcode = StripeBarcode, printedAt }) {
  const L = { showOyklaneLogo: true, showRoutingCode: true, showCustomerPhone: true, showWeight: true, showDimensions: true, showValue: true, showOrderBarcode: true, showOrderDate: true, showItems: true, maxItems: 6, showReturnAddress: true, showReturnPhone: true, showGstin: true, footer: "Shipped with Oyklane", showPartner: true, ...layout };
  const cod = d.paymentType === "COD";
  const pay = cod ? `COD ${inr(d.codAmount)}` : "PREPAID";
  const service = serviceOf(d.courier);
  const items = d.items || [];
  const max = Number(L.maxItems) || 6;
  const routing = L.showRoutingCode && d.routingCode ? d.routingCode : null;
  const parcel = [L.showWeight && `${(Number(d.weightGrams || 0) / 1000).toFixed(2)} kg`, L.showDimensions && d.dimensions && `${d.dimensions.lengthCm}×${d.dimensions.widthCm}×${d.dimensions.heightCm} cm`, L.showValue && `Value ${inr(d.invoiceValue)}`].filter(Boolean).join(" · ");
  const footer = [L.footer, L.showPartner && d.partner ? `Supported by ${d.partner}` : null].filter(Boolean).join(" · ");
  const strip = (
    <div className="row" style={{ borderBottom: 0 }}>
      <div className="cell vr grow">
        <div className="b up clip" style={{ fontSize: 12 }}>{d.courier}</div>
        <div className="clip">AWB {d.awb}</div>
      </div>
      <div className="cell vr" style={{ width: "34%" }}>
        <div className="b">{service}</div>
        <div className="b">{pay}</div>
      </div>
      <div className="cell center" style={{ width: "18%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="big">{routing || "—"}</span>
      </div>
    </div>
  );
  return (
    <div className="oy-lbl">
      <style>{LABEL_CSS}</style>
      <div className="box">
        {/* Courier · service and payment · routing code */}
        <div className="row">
          <div className="cell vr grow">
            <div className="b up clip" style={{ fontSize: 13 }}>{d.courier}</div>
            <div className="clip">Order #{d.orderNumber}{L.showOrderDate ? ` · ${new Date(d.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : ""}</div>
          </div>
          <div className="cell vr" style={{ width: "34%" }}>
            <div className="b" style={{ fontSize: 12 }}>{service}</div>
            <div className="b" style={{ fontSize: 13 }}>{pay}</div>
          </div>
          <div className="cell center" style={{ width: "18%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className={routing && routing.length <= 3 ? "huge" : "big"}>{routing || "—"}</span>
          </div>
        </div>

        {/* AWB barcode (tall) · delivery address */}
        <div className="row" style={{ flex: "0 0 auto" }}>
          <div className="cell vr" style={{ width: "40%", display: "flex", gap: 4, padding: "4px 4px 4px 6px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, flex: 1, minWidth: 0 }}>
              {(L.showOyklaneLogo || L.showStoreName) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span className="k">Shipped through</span>
                  {L.showOyklaneLogo && <BrandMark size={16} />}
                  {L.showStoreName && <span className="b clip" style={{ maxWidth: "1.2in" }}>{d.from?.name}</span>}
                </div>
              )}
              <div className="vbar" style={{ flex: 1 }}>
                <div className="vbar__in">
                  <Barcode value={d.awb} height={58} fontSize={0} />
                </div>
              </div>
            </div>
            <div className="vtext">AWB No. {d.awb}</div>
          </div>
          <div className="cell grow" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="k">Ship to</span>
            <div className="b" style={{ fontSize: 13 }}>{d.to.name}</div>
            <div>{[d.to.address1, d.to.address2].filter(Boolean).join(", ")}</div>
            <div>{d.to.city}{d.to.state ? `, ${d.to.state}` : ""}</div>
            <div className="b" style={{ fontSize: 15 }}>{d.to.pincode}</div>
            {L.showCustomerPhone && d.to.phone && <div>Phone: {d.to.phone}</div>}
            {parcel && <div style={{ marginTop: "auto", fontSize: 9 }}>{parcel}</div>}
          </div>
        </div>

        {/* Sold by */}
        {L.showReturnAddress && (
          <div className="row">
            <div className="cell grow">
              <span className="k">Sold by · if undelivered, return to</span>
              <div>
                <b>{d.from.name}</b>, {[d.from.address1, d.from.address2, d.from.city, d.from.state].filter(Boolean).join(", ")} {d.from.pincode}
              </div>
              <div>
                {L.showReturnPhone && d.from.phone ? `Phone: ${d.from.phone}` : ""}
                {L.showGstin && d.gstin ? `${L.showReturnPhone && d.from.phone ? "  ·  " : ""}GSTIN: ${d.gstin}` : ""}
              </div>
            </div>
          </div>
        )}

        {/* What's inside */}
        <div className="row grow" style={{ flexDirection: "column", overflow: "hidden" }}>
          {L.showItems && (
            <table>
              <thead>
                <tr>
                  <th>{L.showSku ? "SKU | Description" : "Description"}</th>
                  <th style={{ textAlign: "right", width: 36 }}>QTY</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, max).map((i, k) => (
                  <tr key={k}>
                    <td className="clip" style={{ maxWidth: "3.2in" }}>
                      {L.showSku && i.sku ? <b>{i.sku} | </b> : null}
                      {i.title}
                    </td>
                    <td className="b" style={{ textAlign: "right" }}>{i.quantity}</td>
                  </tr>
                ))}
                {items.length > max && (
                  <tr>
                    <td colSpan={2}>+ {items.length - max} more item{items.length - max === 1 ? "" : "s"}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {L.showOrderBarcode && (
            <div className="cell center" style={{ marginTop: "auto" }}>
              <Barcode value={`#${d.orderNumber}`} height={30} fontSize={10} />
            </div>
          )}
          {L.note && <div className="cell b">{L.note}</div>}
        </div>

        {/* Printed at · Oyklane */}
        <div className="row">
          <div className="cell grow b" style={{ fontSize: 8.5 }}>{footer || " "}</div>
          <div className="cell b" style={{ whiteSpace: "nowrap", fontSize: 8.5 }}>Printed at {shortDate(printedAt || new Date())}</div>
        </div>
      </div>
      {/* Tear-off strip */}
      <div className="tear">
        <div className="box" style={{ flex: "none" }}>{strip}</div>
      </div>
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
