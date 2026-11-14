"use client";

import { useId } from "react";

/** The seller badge seal — same drawing as the storefront's (api
 * trust/badge.js): a rosette in the tier's colours, a star (a gem for
 * Diamond) and one dot per level. */
const TONES = {
  basic: ["#e2e8f0", "#64748b", "#ffffff"],
  standard: ["#99f6e4", "#0f766e", "#ffffff"],
  silver: ["#f8fafc", "#94a3b8", "#334155"],
  gold: ["#fef3c7", "#b45309", "#ffffff"],
  platinum: ["#e0e7ff", "#3730a3", "#ffffff"],
  diamond: ["#cffafe", "#0e7490", "#ffffff"],
};
const ORDER = ["basic", "standard", "silver", "gold", "platinum", "diamond"];
const EDGE = Array.from({ length: 24 }, (_, i) => {
  const a = (i * 15 - 90) * (Math.PI / 180);
  const r = i % 2 ? 44 : 50;
  return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
}).join(" ");
const STAR = "50,30 55.9,43.1 70,44.5 59.4,54 62.4,68 50,60.8 37.6,68 40.6,54 30,44.5 44.1,43.1";
const GEM = "38,36 62,36 70,46 50,70 30,46";

export function TrustSeal({ tier = "basic", size = 40, muted = false, className = "" }) {
  const id = useId().replace(/:/g, "");
  const [a, b, ink] = TONES[tier] || TONES.basic;
  const level = Math.max(1, ORDER.indexOf(tier) + 1);
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false" style={muted ? { filter: "grayscale(1)", opacity: 0.45 } : undefined}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <polygon points={EDGE} fill={`url(#g${id})`} />
      <circle cx="50" cy="50" r="35" fill="none" stroke={ink} strokeOpacity=".55" strokeWidth="2" />
      <polygon points={tier === "diamond" ? GEM : STAR} fill={ink} />
      {tier === "diamond" && <path d="M30 46h40M42 36l8 34 8-34" stroke={b} strokeWidth="2" fill="none" opacity=".6" />}
      {Array.from({ length: level }, (_, i) => (
        <circle key={i} cx={50 + (i - (level - 1) / 2) * 7} cy="80" r="2.3" fill={ink} opacity=".9" />
      ))}
    </svg>
  );
}

/** Blue "verified" tick. */
export function VerifiedTick({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#2563eb" d="M12 1.5l2.6 1.9 3.2-.2 1 3 2.7 1.8-.9 3.1.9 3.1-2.7 1.8-1 3-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3-2.7-1.8.9-3.1-.9-3.1 2.7-1.8 1-3 3.2.2z" />
      <path d="M7.5 12.2l3 3 6-6.2" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
