"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "antd";
import { useAdsCoach } from "../context";

const people = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  if (v >= 1e7) return `${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
};

/**
 * Audience definition, as in Ads Manager: Meta's estimate of how many
 * people the ad set can reach, on a scale from specific to broad.
 */
export function AudienceMeter({ adSet, specialAdCategories }) {
  const api = useAdsCoach();
  const [est, setEst] = useState(null);
  const [error, setError] = useState(null);
  const key = JSON.stringify([adSet.targeting, adSet.goal, specialAdCategories]);
  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      try {
        setError(null);
        const d = await api.request("/targeting/estimate", { method: "POST", body: { targeting: adSet.targeting, goal: adSet.goal, specialAdCategories } });
        if (live) setEst(d.estimate || { lower: null });
      } catch (err) {
        if (live) setError(err.message);
      }
    }, 700);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const lo = est?.lower;
  // Log scale: 10K at the left edge, 100M at the right.
  const pos = lo ? Math.min(100, Math.max(0, ((Math.log10(lo) - 4) / 4) * 100)) : null;
  const verdict = lo == null ? null : lo < 100000 ? ["Specific", "Narrow audiences usually cost more per result. Add places, or remove some interests."] : lo < 2000000 ? ["Defined", "A good size for steady delivery."] : ["Broad", "Meta has room to find buyers. Usually the cheapest per result."];
  return (
    <section className="rounded-md border border-app-border bg-app-surface px-4 py-3" aria-label="Audience definition">
      <h3 className="m-0 text-[14px] font-semibold">Audience definition</h3>
      {error ? (
        <p className="m-0 mt-2 text-[12.5px] text-ink-muted">Meta couldn&apos;t estimate this audience: {error}</p>
      ) : !est ? (
        <Skeleton active title={false} paragraph={{ rows: 2 }} className="mt-2" />
      ) : (
        <>
          {pos != null && (
            <div className="mt-3">
              <div className="relative h-1.5 rounded-full bg-gradient-to-r from-[#F5C26B] via-[#7FC8A0] to-[#7FC8A0]" aria-hidden="true">
                <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink shadow" style={{ left: `${pos}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-ink-subtle">
                <span>Specific</span>
                <span>Broad</span>
              </div>
            </div>
          )}
          <dl className="m-0 mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[12.5px]">
            <dt className="text-ink-muted">Estimated audience size</dt>
            <dd className="m-0 text-right tabular-nums">{lo != null ? `${people(est.lower)}–${people(est.upper)}` : "Not available yet"}</dd>
          </dl>
          {verdict && (
            <p className="m-0 mt-2 text-[12px] leading-snug text-ink-muted">
              <span className="font-medium text-ink">{verdict[0]}.</span> {verdict[1]}
            </p>
          )}
          <p className="m-0 mt-2 text-[11.5px] text-ink-subtle">Estimates from Meta; actual reach may differ.</p>
        </>
      )}
    </section>
  );
}
