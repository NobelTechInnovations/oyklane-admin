"use client";

import { useEffect, useRef, useState } from "react";
import { Select, Spin, Tooltip } from "antd";
import { Info } from "lucide-react";
import { useAdsCoach } from "../context";

/** One block of the form, like Ads Manager's: a title, an optional line
 * under it, then the fields. */
export function Section({ title, description, extra, children, id }) {
  return (
    <section id={id} className="rounded-md border border-app-border bg-app-surface">
      <header className="flex items-start justify-between gap-3 px-4 pt-3.5">
        <div className="min-w-0">
          <h3 className="m-0 text-[14px] font-semibold text-ink">{title}</h3>
          {description && <p className="m-0 mt-0.5 text-[12.5px] leading-snug text-ink-muted">{description}</p>}
        </div>
        {extra}
      </header>
      <div className="flex flex-col gap-3 px-4 pb-4 pt-3">{children}</div>
    </section>
  );
}

/** A field label with the explanation behind an (i), so the form stays quiet. */
export function Label({ children, tip }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      {tip && (
        <Tooltip title={tip}>
          <Info size={13} className="cursor-help text-ink-subtle" aria-label={typeof tip === "string" ? tip : "More information"} />
        </Tooltip>
      )}
    </span>
  );
}

export const Note = ({ children, tone }) => <p className={`m-0 text-[12px] leading-snug ${tone === "warn" ? "text-status-warning" : "text-ink-muted"}`}>{children}</p>;

/** Searches Meta's targeting (locations, interests, languages) as you type. */
export function SearchSelect({ type, value, onChange, placeholder, mode = "multiple" }) {
  const api = useAdsCoach();
  const [opts, setOpts] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);
  const search = (q) => {
    clearTimeout(timer.current);
    if (!q || q.length < 2) return;
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const d = await api.request(`/targeting/search?type=${type}&q=${encodeURIComponent(q)}`);
        setOpts(d.results);
      } catch {
        setOpts([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };
  const key = (o) => String(o.key ?? o.id);
  return (
    <Select
      mode={mode}
      labelInValue
      showSearch
      filterOption={false}
      onSearch={search}
      notFoundContent={loading ? <Spin size="small" /> : "Type to search"}
      placeholder={placeholder}
      value={(value || []).map((v) => ({ value: key(v), label: v.label || v.name }))}
      onChange={(sel) => onChange(sel.map((s) => opts.find((o) => key(o) === s.value) || (value || []).find((v) => key(v) === s.value) || { key: s.value, name: s.label, label: s.label }))}
      options={opts.map((o) => ({ value: key(o), label: o.label || `${o.name}${o.size ? ` · ${o.size}` : ""}` }))}
      className="w-full"
    />
  );
}

/** True on screens wide enough for the side panels. */
export function useWide(query = "(min-width: 1280px)") {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setWide(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return wide;
}

/** The ad account's currency sign, for budget fields. */
export function currencySign(api) {
  if (api.currencySymbol) return api.currencySymbol;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: api.currency || "INR", currencyDisplay: "narrowSymbol" }).formatToParts(0).find((p) => p.type === "currency")?.value || api.currency;
  } catch {
    return api.currency || "₹";
  }
}
