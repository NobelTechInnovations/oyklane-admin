"use client";

import { useEffect, useRef, useState } from "react";

/** Scales a fixed-size page to its box's width (kept in step on resize). */
function useFit(width) {
  const ref = useRef(null);
  const [scale, setScale] = useState(0.25);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / width || 0.25);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return [ref, scale];
}

function Scaled({ src, title, width, height, ratio, className = "" }) {
  const [ref, scale] = useFit(width);
  const [loaded, setLoaded] = useState(false);
  return (
    <div ref={ref} className={`relative w-full overflow-hidden bg-app-bg ${className}`} style={{ aspectRatio: ratio }}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-app-bg" />}
      <iframe
        title={title}
        src={src}
        loading="lazy"
        tabIndex={-1}
        aria-hidden="true"
        onLoad={() => setLoaded(true)}
        className="absolute left-0 top-0 origin-top-left pointer-events-none border-0"
        style={{ width, height, transform: `scale(${scale})` }}
      />
    </div>
  );
}

/**
 * A live, scaled-down render of a store page (the theme's home page) in a
 * browser window, with an optional phone beside it. The page renders at
 * desktop width and is scaled to fit, so it looks like the real thing. Not
 * clickable — a picture that stays current.
 */
export function LivePreview({ src, title, url, phone = false, className = "" }) {
  return (
    <div className={`relative ${phone ? "pr-[12%] pb-[4%]" : ""} ${className}`}>
      <div className="overflow-hidden rounded-[10px] border border-app-border bg-app-surface shadow-card">
        <div className="flex h-7 items-center gap-1.5 border-b border-app-border bg-app-bg px-3" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-ink-subtle/40" />
          <span className="h-2 w-2 rounded-full bg-ink-subtle/40" />
          <span className="h-2 w-2 rounded-full bg-ink-subtle/40" />
          {url && <span className="mx-auto max-w-[60%] truncate rounded-md border border-app-border bg-app-surface px-3 text-[11px] leading-[18px] text-ink-muted">{url}</span>}
        </div>
        <Scaled src={src} title={title} width={1440} height={900} ratio="16 / 10" />
      </div>
      {phone && (
        <div className="absolute bottom-0 right-0 w-[23%] rounded-[18px] bg-[#0f141c] p-[5px] shadow-[0_18px_40px_-18px_rgba(16,19,24,0.45)]" aria-hidden="true">
          <Scaled src={src} title={`${title} on a phone`} width={390} height={823} ratio="390 / 823" className="rounded-[14px]" />
        </div>
      )}
    </div>
  );
}
