"use client";

/** How a courier price is made up: base rate + fuel surcharge + margin
 * (+ COD charge) = subtotal, + GST = what you pay. */
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PriceParts({ b, className = "" }) {
  if (!b) return null;
  const rows = [
    ["Courier base rate", b.base],
    [`Fuel surcharge (${b.fuelPercent}%)`, b.fuel],
    ["Oyklane margin", b.margin],
    ...(b.cod > 0 ? [["Cash on delivery charge", b.cod]] : []),
    ["Subtotal", b.subtotal, true],
    [`GST (${b.gstPercent}%)`, b.gst],
  ];
  return (
    <dl className={`m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-[12px] tabular-nums ${className}`}>
      {rows.map(([label, v, strong]) => (
        <div key={label} className="contents">
          <dt className={strong ? "border-t border-app-border pt-0.5 text-ink" : "text-ink-muted"}>{label}</dt>
          <dd className={`m-0 text-right ${strong ? "border-t border-app-border pt-0.5 text-ink" : "text-ink-muted"}`}>{inr(v)}</dd>
        </div>
      ))}
      <dt className="border-t border-app-border pt-0.5 font-semibold text-ink">You pay</dt>
      <dd className="m-0 border-t border-app-border pt-0.5 text-right font-semibold text-ink">{inr(b.price)}</dd>
    </dl>
  );
}
