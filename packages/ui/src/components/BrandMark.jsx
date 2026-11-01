"use client";

/**
 * The Oyklane logo (logo kit, 2026): a blue tile with a white "O" and lane
 * bar, then the wordmark — drawn from the kit's own paths so every app
 * matches the brand files exactly. `size` is the tile's height in px;
 * `tone="dark"` turns the wordmark white for dark surfaces; `label` adds a
 * small product suffix ("Admin", "Platform"); `showWordmark={false}` gives
 * the tile alone.
 */
export const OYKLANE_BLUE = "#1F5FD6";
// The lowercase wordmark: the "o" ring, then "yklane" (moved left by
// the room the old capital O took). Same artwork as oyklane.com.
const WORDMARK_O = "M148.22 69.55A28.60 27.36 0 1 0 205.42 69.55A28.60 27.36 0 1 0 148.22 69.55Z M162.82 69.55A14.00 13.96 0 1 0 190.82 69.55A14.00 13.96 0 1 0 162.82 69.55Z";
const WORDMARK = "M237.89 116.88Q235.58 116.88 233.42 116.5Q231.26 116.11 229.63 115.25V103.44Q230.98 103.82 232.8 104.11Q234.62 104.4 236.16 104.4Q240.38 104.4 242.21 102.43Q244.03 100.46 245.18 97.97L248.74 89.81L248.54 101.81L225.5 43.34H240.96L256.22 84.91H250.46L265.73 43.34H281.18L258.72 100.66Q256.61 106.03 253.54 109.68Q250.46 113.33 246.58 115.1Q242.69 116.88 237.89 116.88Z M283.68 95.76V23.09H298.08V69.65L292.7 67.92L315.84 43.34H333.6L314.59 64.46L333.5 95.76H317.18L301.34 69.17L309.7 67.06L293.66 84.53L298.08 76.18V95.76Z M336.1 95.76V23.09H350.5V95.76Z M373.44 96.91Q367.78 96.91 363.65 95.09Q359.52 93.26 357.31 89.86Q355.1 86.45 355.1 81.74Q355.1 77.33 357.12 73.92Q359.14 70.51 363.31 68.21Q367.49 65.9 373.73 64.94L389.76 62.35V72.91L376.32 75.31Q373.25 75.89 371.62 77.28Q369.98 78.67 369.98 81.26Q369.98 83.66 371.81 85.01Q373.63 86.35 376.32 86.35Q379.87 86.35 382.56 84.82Q385.25 83.28 386.74 80.64Q388.22 78 388.22 74.83V61.2Q388.22 58.22 385.87 56.21Q383.52 54.19 379.49 54.19Q375.65 54.19 372.72 56.3Q369.79 58.42 368.45 61.87L356.93 56.4Q358.46 51.98 361.82 48.82Q365.18 45.65 369.89 43.92Q374.59 42.19 380.16 42.19Q386.78 42.19 391.87 44.59Q396.96 46.99 399.79 51.26Q402.62 55.54 402.62 61.2V95.76H389.18V87.31L392.45 86.74Q390.14 90.19 387.36 92.45Q384.58 94.7 381.12 95.81Q377.66 96.91 373.44 96.91Z M409.34 95.76V43.34H422.78V53.71L422.02 51.41Q423.84 46.7 427.92 44.45Q432 42.19 437.47 42.19Q443.42 42.19 447.89 44.69Q452.35 47.18 454.85 51.65Q457.34 56.11 457.34 62.06V95.76H442.94V65.14Q442.94 62.06 441.74 59.86Q440.54 57.65 438.38 56.4Q436.22 55.15 433.34 55.15Q430.56 55.15 428.35 56.4Q426.14 57.65 424.94 59.86Q423.74 62.06 423.74 65.14V95.76Z M488.26 96.91Q479.9 96.91 473.76 93.22Q467.62 89.52 464.26 83.28Q460.9 77.04 460.9 69.46Q460.9 61.58 464.4 55.44Q467.9 49.3 473.86 45.74Q479.81 42.19 487.3 42.19Q493.54 42.19 498.34 44.16Q503.14 46.13 506.45 49.68Q509.76 53.23 511.49 57.89Q513.22 62.54 513.22 68.02Q513.22 69.55 513.07 71.04Q512.93 72.53 512.54 73.58H473.28V63.02H504.38L497.57 68.02Q498.53 63.89 497.47 60.67Q496.42 57.46 493.78 55.58Q491.14 53.71 487.3 53.71Q483.55 53.71 480.86 55.54Q478.18 57.36 476.83 60.91Q475.49 64.46 475.78 69.55Q475.39 73.97 476.83 77.33Q478.27 80.69 481.25 82.56Q484.22 84.43 488.45 84.43Q492.29 84.43 495.02 82.9Q497.76 81.36 499.3 78.67L510.82 84.14Q509.28 87.98 505.97 90.86Q502.66 93.74 498.14 95.33Q493.63 96.91 488.26 96.91Z";
const W = 497.74;

export function BrandMark({ size = 26, tone = "light", label, showWordmark = true }) {
  const text = tone === "dark" ? "#F5F5F4" : "#0E1726";
  const sub = tone === "dark" ? "rgba(245,245,244,0.55)" : "#9A9AA5";
  const width = showWordmark ? Math.round((size * W) / 120) : size;
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <svg
        width={width}
        height={size}
        viewBox={showWordmark ? `0 0 ${W} 120` : "0 0 120 120"}
        className="shrink-0"
        {...(showWordmark ? { role: "img", "aria-label": "oyklane" } : { "aria-hidden": true })}
      >
        <rect width="120" height="120" rx="30" fill={OYKLANE_BLUE} />
        <circle cx="54" cy="60" r="24" fill="none" stroke="#fff" strokeWidth="13" />
        <rect x="78" y="53.5" width="24" height="13" rx="6.5" fill="#fff" />
        {showWordmark && <path d={WORDMARK_O} fill={text} fillRule="evenodd" />}
        {showWordmark && <path d={WORDMARK} fill={text} transform="translate(-18.64 0)" />}
      </svg>
      {label && showWordmark && (
        <span className="leading-none" style={{ color: sub, fontWeight: 500, fontSize: Math.round(size * 0.46) }}>
          {label}
        </span>
      )}
    </span>
  );
}
