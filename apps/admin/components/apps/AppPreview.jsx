"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Lock, Phone, ShoppingBag, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

/**
 * Live previews for Apps ▸ One-Click Checkout and Apps ▸ Phone Login: a
 * phone-sized mock of what shoppers see, redrawn as the seller changes a
 * setting, and a short list of what the current choices do.
 */

const hexOf = (c) => (typeof c === "string" ? c : c?.toHexString?.() || "");
const validHex = (c) => (/^#[0-9a-f]{6}$/i.test(hexOf(c)) ? hexOf(c) : "");
const RADIUS = { theme: 10, rounded: 10, pill: 999, square: 0 };

function useStoreName() {
  const [name, setName] = useState("Your store");
  useEffect(() => {
    apiFetch("/api/store")
      .then((d) => d?.store?.name && setName(d.store.name))
      .catch(() => {});
  }, []);
  return name;
}

/** Readable text on a colour: white on dark, near-black on light. */
function textOn(hex) {
  const h = validHex(hex);
  if (!h) return "#fff";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? "#18181B" : "#fff";
}

function Frame({ children, label }) {
  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className="relative overflow-hidden rounded-[28px] border-[6px] border-[#18181B] bg-[#E9E9EC]" style={{ aspectRatio: "9 / 17" }} aria-label={label} role="img">
        {/* The store behind the popup, dimmed */}
        <div className="absolute inset-0 flex flex-col gap-2 p-3 opacity-60" aria-hidden="true">
          <div className="h-5 w-24 rounded bg-white/80" />
          <div className="h-24 rounded-lg bg-white/70" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-20 rounded-lg bg-white/70" />
            <div className="h-20 rounded-lg bg-white/70" />
          </div>
        </div>
        <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

function Explain({ items }) {
  return (
    <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
      {items.filter(Boolean).map(([title, text]) => (
        <li key={title} className="text-[12.5px] leading-snug text-ink-muted">
          <b className="font-semibold text-ink">{title}</b> — {text}
        </li>
      ))}
    </ul>
  );
}

// ── Phone Login ────────────────────────────────────────────────────

const AUTO = { off: "never opens by itself", 0: "opens as soon as the page loads", scroll: "opens when they scroll halfway down", exit: "opens when they move to leave (computers)" };
const PAGES = { all: "every page", home: "the home page", home_product: "home and product pages", product: "product pages", collection: "collection pages", cart: "the cart page" };
const OFTEN = { visit: "once per visit", day: "once a day", week: "once a week", page: "on every page they open" };

export function PhoneLoginPreview({ values = {} }) {
  const store = useStoreName();
  const v = values || {};
  const accent = validHex(v.accent) || "#18181B";
  const auto = String(v.autoOpen ?? "off");
  const autoText = AUTO[auto] || `opens after ${Number(auto) >= 60 ? `${Number(auto) / 60} minute` : `${auto} seconds`}`;
  return (
    <div>
      <Frame label="Sign-in popup preview">
        <div className="absolute inset-x-0 bottom-0 rounded-t-[18px] bg-white px-4 pb-5 pt-4 shadow-[0_-8px_24px_rgba(0,0,0,0.15)]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#71717A]">{store}</span>
            <X size={14} className="text-[#71717A]" aria-hidden="true" />
          </div>
          <p className="m-0 text-[16px] font-semibold leading-tight text-[#18181B]">{v.title || "Sign in with your phone"}</p>
          <p className="m-0 mt-1 text-[11.5px] leading-snug text-[#52525B]">{v.subtitle || "We'll send a one-time code — no password needed."}</p>
          {v.offer && (
            <p className="m-0 mt-2 rounded-md px-2 py-1 text-[11px] font-medium" style={{ background: `${accent}14`, color: accent }}>
              {v.offer}
            </p>
          )}
          {v.continueAs !== "off" && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#E4E4E7] px-2.5 py-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: accent }}>
                R
              </span>
              <span className="text-[11.5px] text-[#18181B]">Continue as Riya · ••••3210</span>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#D4D4D8] px-2.5 py-2 text-[12px] text-[#71717A]">
            <Phone size={12} aria-hidden="true" /> +91 Mobile number
          </div>
          <div className="mt-2.5 rounded-lg py-2 text-center text-[12.5px] font-semibold" style={{ background: accent, color: textOn(accent) }}>
            {v.button || "Send code"}
          </div>
          <p className="m-0 mt-2 text-center text-[10px] text-[#A1A1AA]">Code on WhatsApp and SMS</p>
        </div>
      </Frame>
      <Explain
        items={[
          ["Account or Sign in", v.popup === "page" ? "takes shoppers to the sign-in page (this popup isn't used)." : "opens this popup."],
          ["By itself", auto === "off" ? "the popup never opens on its own." : `it ${autoText}, on ${PAGES[v.autoPages || "all"]}, ${OFTEN[v.autoFrequency || "visit"]} — only for shoppers who aren't signed in.`],
          ["Continue as", v.continueAs === "off" ? "every shopper types their number." : "shoppers already signed in on another Oyklane store sign in with one tap, no code."],
          v.offer && ["Offer line", "shows above the number box — put a code from Discounts in it."],
        ]}
      />
    </div>
  );
}

// ── One-Click Checkout ─────────────────────────────────────────────

const CARD = { bordered: "border border-[#E4E4E7] bg-white", filled: "bg-[#F4F4F5]", minimal: "bg-transparent" };

export function OneClickPreview({ values = {} }) {
  const store = useStoreName();
  const v = values || {};
  const accent = validHex(v.accent) || "#18181B";
  const btnText = validHex(v.buttonText) || textOn(accent);
  const radius = RADIUS[v.corners] ?? 10;
  const count = Math.min(4, Math.max(1, Number(v.crossSellLimit) || 4));
  const layout = v.crossSellLayout || "row";
  const partialNow = v.partial ? (v.partialType === "fixed" ? `₹${Number(v.partialValue) || 0}` : `${Number(v.partialValue) || 0}%`) : null;
  return (
    <div>
      <Frame label="Checkout popup preview">
        <div className="absolute inset-x-0 bottom-0 top-10 flex flex-col overflow-hidden rounded-t-[18px] bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.15)]">
          <div className="flex items-center justify-between border-b border-[#F4F4F5] px-3.5 py-2.5">
            <span className="text-[12.5px] font-semibold text-[#18181B]">{store}</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-[#71717A]">
              <Lock size={10} aria-hidden="true" /> Secure checkout
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2 overflow-hidden px-3.5 py-2.5">
            <div className="rounded-lg border border-[#E4E4E7] px-2.5 py-2">
              <div className="flex items-center justify-between text-[11.5px] text-[#18181B]">
                <span className="inline-flex items-center gap-1.5">
                  <ShoppingBag size={12} aria-hidden="true" /> Order summary · 2 items
                </span>
                <span className="inline-flex items-center gap-1 font-semibold">
                  ₹798 <ChevronDown size={12} className={v.summary ? "rotate-180" : ""} aria-hidden="true" />
                </span>
              </div>
              {v.summary && (
                <div className="mt-2 flex flex-col gap-1.5 border-t border-[#F4F4F5] pt-2">
                  {["Product one", "Product two"].map((n) => (
                    <div key={n} className="flex items-center gap-2 text-[10.5px] text-[#52525B]">
                      <span className="h-6 w-6 rounded bg-[#F4F4F5]" />
                      <span className="flex-1">{n}</span>
                      <span>₹399</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-lg border px-2.5 py-2 text-[11px]" style={{ borderColor: accent }}>
              <p className="m-0 font-semibold text-[#18181B]">Deliver to Riya · Home</p>
              <p className="m-0 text-[#71717A]">12 MG Road, Jaipur 302001</p>
            </div>
            {v.crossSell && (
              <div>
                <p className="m-0 mb-1 text-[11px] font-semibold text-[#18181B]">{v.crossSellTitle || "You may also like"}</p>
                <div className={layout === "list" ? "flex flex-col gap-1.5" : layout === "grid" ? "grid grid-cols-2 gap-1.5" : "flex gap-1.5 overflow-hidden"}>
                  {Array.from({ length: layout === "list" ? Math.min(count, 2) : count }).map((_, i) => (
                    <div key={i} className={`${CARD[v.crossSellCard || "bordered"]} ${layout === "list" ? "flex items-center gap-2" : layout === "row" ? "w-[70px] shrink-0" : ""} rounded-md p-1.5`}>
                      <span className={`block rounded bg-[#E4E4E7] ${layout === "list" ? "h-6 w-6" : "h-9 w-full"}`} />
                      <span className={`flex ${layout === "list" ? "flex-1 items-center justify-between" : "mt-1 flex-col"} gap-0.5`}>
                        <span className="text-[9.5px] text-[#52525B]">₹249</span>
                        <span className="text-[9px] font-semibold" style={{ color: accent }}>
                          + Add
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-auto flex flex-col gap-1.5">
              {partialNow && (
                <p className="m-0 rounded-md bg-[#F4F4F5] px-2 py-1 text-[10.5px] text-[#18181B]">
                  Pay {partialNow} now, the rest on delivery
                  {Number(v.partialMinOrder) > 0 ? ` (orders from ₹${v.partialMinOrder})` : ""}
                </p>
              )}
              <div className="py-2 text-center text-[12.5px] font-semibold" style={{ background: accent, color: btnText, borderRadius: radius }}>
                Pay ₹798
              </div>
            </div>
          </div>
        </div>
      </Frame>
      <Explain
        items={[
          ["Checkout colour", validHex(v.accent) ? "buttons, the chosen address and Add links use it." : "empty, so your theme's colour is used (shown in black here)."],
          ["Button corners", v.corners === "theme" || !v.corners ? "follow your theme's buttons." : `${v.corners} on every checkout button.`],
          ["Order summary", v.summary ? "shows the items open when the popup opens." : "starts closed — shoppers tap it to see the items."],
          ["You may also like", v.crossSell ? `${count} product${count === 1 ? "" : "s"} in the cart (${{ auto: "best sellers", collection: "from a collection", products: "products you pick" }[v.crossSellSource || "auto"]}), with one-tap Add.` : "off — no suggestions in the cart."],
          ["Partial payment", partialNow ? `shoppers who pick cash on delivery pay ${partialNow} online first.` : "off — cash on delivery is paid in full on delivery."],
        ]}
      />
    </div>
  );
}
