"use client";

/** The seller badge seal — same drawing as the storefront's (api
 * trust/badge.js): a flat rosette in the badge's colour with a star (a gem
 * for Diamond). */
const TONES = {
  basic: ["#8a94a6", "#ffffff"],
  standard: ["#0f766e", "#ffffff"],
  silver: ["#a3acb9", "#ffffff"],
  gold: ["#c08a2b", "#ffffff"],
  platinum: ["#56657f", "#ffffff"],
  diamond: ["#1b8aa3", "#ffffff"],
};
const EDGE = Array.from({ length: 24 }, (_, i) => {
  const a = (i * 15 - 90) * (Math.PI / 180);
  const r = i % 2 ? 44 : 50;
  return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
}).join(" ");
const STAR = "50,27 56.5,41.5 72,43 60.3,53.5 63.6,69 50,61 36.4,69 39.7,53.5 28,43 43.5,41.5";
const GEM = "36,38 64,38 72,48 50,72 28,48";

export function TrustSeal({ tier = "basic", size = 40, muted = false, className = "" }) {
  const [fill, ink] = TONES[tier] || TONES.basic;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false" style={muted ? { filter: "grayscale(1)", opacity: 0.45 } : undefined}>
      <polygon points={EDGE} fill={fill} />
      <polygon points={tier === "diamond" ? GEM : STAR} fill={ink} />
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
