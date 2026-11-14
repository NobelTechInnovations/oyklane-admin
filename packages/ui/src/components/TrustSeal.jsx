"use client";

/** The seller badge — same drawing as the storefront's (api
 * trust/badge.js): a flat shield in the badge's colour with a thin inner
 * line and a star (a gem for Elite). */
const TONES = {
  basic: "#8a94a6",
  standard: "#0f766e",
  silver: "#9aa4b2",
  gold: "#c08a2b",
  platinum: "#56657f",
  diamond: "#1b8aa3",
};
const SHIELD = "M50 5 L86 17 V46 C86 70 70 86 50 95 C30 86 14 70 14 46 V17 Z";
const INNER = "M50 14 L78 23.5 V46 C78 64.5 66 77.5 50 85 C34 77.5 22 64.5 22 46 V23.5 Z";
const STAR = "50,31 54.2,43.2 67.1,43.4 56.8,51.2 60.6,63.6 50,56.2 39.4,63.6 43.2,51.2 32.9,43.4 45.8,43.2";
const GEM = "39.5,38 60.5,38 67,46 50,64 33,46";

export function TrustSeal({ tier = "basic", size = 40, muted = false, className = "" }) {
  const fill = TONES[tier] || TONES.basic;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false" style={muted ? { filter: "grayscale(1)", opacity: 0.45 } : undefined}>
      <path d={SHIELD} fill={fill} stroke={fill} strokeWidth="5" strokeLinejoin="round" />
      <path d={INNER} fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="2.5" strokeLinejoin="round" />
      <polygon points={tier === "diamond" ? GEM : STAR} fill="#fff" />
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
