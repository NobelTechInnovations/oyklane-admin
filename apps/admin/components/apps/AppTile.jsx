"use client";

import { AppIcon } from "@shopcycle/ui";
import { Boxes, Clapperboard, MousePointerClick, Network, Star, Zap } from "lucide-react";
import { APP_BRANDS } from "./brand-logos";

// Each category gets its own soft tint on the app's icon tile.
const TINT = {
  automation: "from-[#EDE8FF] to-[#E3F7F4] text-[#5B3FE0]",
  checkout: "from-[#E3F7F4] to-[#E8F1FF] text-[#0F8B7A]",
  customers: "from-[#FFF1E6] to-[#FFE9EF] text-[#C2410C]",
  marketing: "from-[#FFE9EF] to-[#EDE8FF] text-[#BE185D]",
  analytics: "from-[#E8F1FF] to-[#EDE8FF] text-[#1D4ED8]",
  utility: "from-[#F1F1F4] to-[#E9E9EE] text-ink",
  other: "from-[#F1F1F4] to-[#E9E9EE] text-ink",
};

// A clearer picture for apps whose catalogue icon is generic.
const OWN_ICON = {
  "deal-share": Zap,
  "shoppable-videos": Clapperboard,
  bundles: Boxes,
  "xml-sitemap": Network,
  "one-click-checkout": MousePointerClick,
  "product-reviews": Star,
};

/** The brand's own mark, for apps that connect Google, Meta or WhatsApp. */
export function BrandGlyph({ app, size, white = false }) {
  const b = APP_BRANDS[app.key];
  if (!b) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={white ? "#fff" : b.hex} role="img" aria-label={b.title}>
      <path d={b.path} />
    </svg>
  );
}

export function AppTile({ app, size = 44 }) {
  if (APP_BRANDS[app.key]) {
    return (
      <span
        className="shrink-0 rounded-[12px] bg-white flex items-center justify-center border border-app-border shadow-[0_1px_2px_rgba(17,17,20,0.06)]"
        style={{ width: size, height: size }}
      >
        <BrandGlyph app={app} size={Math.round(size * 0.5)} />
      </span>
    );
  }
  return (
    <span
      className={`shrink-0 rounded-[12px] bg-gradient-to-br ${TINT[app.category] || TINT.other} flex items-center justify-center border border-white shadow-[0_1px_2px_rgba(17,17,20,0.06)]`}
      style={{ width: size, height: size }}
    >
      {OWN_ICON[app.key] ? (() => {
        const I = OWN_ICON[app.key];
        return <I size={Math.round(size * 0.45)} strokeWidth={1.9} aria-hidden="true" />;
      })() : <AppIcon iconKey={app.iconKey} size={Math.round(size * 0.45)} />}
    </span>
  );
}
