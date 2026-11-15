"use client";

/** The seller badge — same drawing as the storefront's (api
 * trust/badge.js): a flat shield in the badge's colour with a thin inner
 * line and its own mark — a sprout, a star, two stars, a gold star, a
 * crown, a gem. */
const TONES = {"basic": "#64748b", "standard": "#16a34a", "silver": "#2563eb", "gold": "#c08a2b", "platinum": "#7c3aed", "diamond": "#0e7490"};
const SHIELD = "M50 5 L86 17 V46 C86 70 70 86 50 95 C30 86 14 70 14 46 V17 Z";
const INNER = "M50 14 L78 23.5 V46 C78 64.5 66 77.5 50 85 C34 77.5 22 64.5 22 46 V23.5 Z";
const MARKS = {"basic": "M48 47h4v19h-4z M50 51C49 41 41 35 31 36C31 46 39 52 50 51Z M50 47C51 36 59 30 70 31C70 42 61 48 50 47Z", "standard": "M50,31 L54.2,43.2 L67.1,43.4 L56.8,51.2 L60.6,63.6 L50,56.2 L39.4,63.6 L43.2,51.2 L32.9,43.4 L45.8,43.2 Z", "silver": "M38.5,38.9 L41.1,46.5 L49.1,46.6 L42.7,51.4 L45.1,59.1 L38.5,54.5 L31.9,59.1 L34.3,51.4 L27.9,46.6 L35.9,46.5 Z M61.5,38.9 L64.1,46.5 L72.1,46.6 L65.7,51.4 L68.1,59.1 L61.5,54.5 L54.9,59.1 L57.3,51.4 L50.9,46.6 L58.9,46.5 Z", "gold": "M50,31 L54.2,43.2 L67.1,43.4 L56.8,51.2 L60.6,63.6 L50,56.2 L39.4,63.6 L43.2,51.2 L32.9,43.4 L45.8,43.2 Z", "platinum": "M30 60L33 37L42 48L50 33L58 48L67 37L70 60Z M31 63h38v5H31z", "diamond": "M39.5 38L60.5 38L67 46L50 64L33 46Z"};

export function TrustSeal({ tier = "basic", size = 40, muted = false, className = "" }) {
  const fill = TONES[tier] || TONES.basic;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false" style={muted ? { filter: "grayscale(1)", opacity: 0.45 } : undefined}>
      <path d={SHIELD} fill={fill} stroke={fill} strokeWidth="5" strokeLinejoin="round" />
      <path d={INNER} fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="2.5" strokeLinejoin="round" />
      <path d={MARKS[tier] || MARKS.basic} fill="#fff" />
    </svg>
  );
}

/** Blue "verified" tick. */
export function VerifiedTick({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="11" fill="#2563eb" />
      <path d="M7.3 12.3l3.1 3.1 6.3-6.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
