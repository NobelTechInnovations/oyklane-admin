"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Button, Skeleton, Tooltip } from "antd";
import { useAdsCoach } from "../context";

// Image previews make the request big and don't change the advice.
const lean = (spec) => JSON.stringify(spec, (k, v) => (/Preview$/.test(k) ? undefined : v));

/** Reviews the draft as it changes (POST /coach/review), for the score and
 * the estimate; shared by the side panel and Review. */
export function useReview(spec) {
  const api = useAdsCoach();
  const [review, setReview] = useState(null);
  const [failed, setFailed] = useState(false);
  const body = useMemo(() => (spec ? lean(spec) : null), [spec]);
  useEffect(() => {
    if (!body) return undefined;
    let live = true;
    const t = setTimeout(() => {
      api
        .request("/coach/review", { method: "POST", body: { spec: JSON.parse(body) } })
        .then((r) => {
          if (!live) return;
          setReview(r);
          setFailed(false);
        })
        .catch(() => live && setFailed(true));
    }, 900);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [body]); // eslint-disable-line react-hooks/exhaustive-deps
  return { review, failed };
}

const DOT = { warn: "bg-status-warning", tip: "bg-accent", good: "bg-status-success" };

/**
 * Opportunity score and recommendations, the way Ads Manager shows them:
 * a score out of 100 and a short list, each with Apply when the change is
 * safe to make in one click. The current step's come first.
 */
export function Recommendations({ spec, step, review, failed, onApply, all }) {
  const api = useAdsCoach();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(null);
  const [more, setMore] = useState(false);

  async function apply(fix) {
    setBusy(fix.kind);
    try {
      const { spec: next } = await api.request("/coach/fix", { method: "POST", body: { spec, kind: fix.kind } });
      onApply(next);
      message.success(`${fix.label}: done`);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  const items = (review?.suggestions || []).filter((s) => s.level !== "good");
  const sorted = all ? items : [...items.filter((s) => s.step === step), ...items.filter((s) => s.step !== step)];
  const shown = more || all ? sorted : sorted.slice(0, 3);
  const tone = review ? (review.score >= 85 ? "text-status-success" : review.score >= 65 ? "text-accent" : "text-status-warning") : "";

  return (
    <section className="rounded-md border border-app-border bg-app-surface" aria-label="Opportunity score">
      <header className="flex items-end justify-between gap-3 border-b border-app-border px-4 py-3">
        <div>
          <h3 className="m-0 text-[14px] font-semibold">
            <Tooltip title="How well this campaign is set up, out of 100. It goes up as you apply the recommendations.">Opportunity score</Tooltip>
          </h3>
          <p className="m-0 text-[12px] text-ink-muted">{review ? `${items.length} recommendation${items.length === 1 ? "" : "s"}` : "Checking…"}</p>
        </div>
        {review && (
          <p className="m-0 leading-none">
            <span className={`text-[26px] font-semibold tabular-nums ${tone}`}>{review.score}</span>
            <span className="text-[12px] text-ink-muted"> /100</span>
          </p>
        )}
      </header>
      {!review && !failed && (
        <div className="px-4 py-3">
          <Skeleton active title={false} paragraph={{ rows: 3 }} />
        </div>
      )}
      {failed && !review && <p className="m-0 px-4 py-3 text-[12.5px] text-ink-muted">Couldn&apos;t check the campaign just now.</p>}
      {review && !items.length && <p className="m-0 px-4 py-3 text-[12.5px] text-ink-muted">No recommendations. This campaign follows the usual best practices.</p>}
      {shown.length > 0 && (
        <ul className="m-0 list-none divide-y divide-app-border p-0">
          {shown.map((s) => (
            <li key={s.id} className="flex gap-2.5 px-4 py-3">
              <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${DOT[s.level] || DOT.tip}`} aria-label={s.level === "warn" ? "Important" : "Suggestion"} />
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[13px] font-medium leading-snug">{s.title}</p>
                <p className="m-0 mt-0.5 text-[12px] leading-snug text-ink-muted">{s.text}</p>
                {s.fix && (
                  <Button size="small" type="link" className="!h-auto !px-0 !pt-1" loading={busy === s.fix.kind} onClick={() => apply(s.fix)}>
                    {s.fix.label}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {!all && sorted.length > 3 && (
        <div className="border-t border-app-border px-4 py-2">
          <Button size="small" type="link" className="!px-0" onClick={() => setMore((v) => !v)}>
            {more ? "Show fewer" : `Show all ${sorted.length}`}
          </Button>
        </div>
      )}
    </section>
  );
}

/** What the budget is likely to buy (from the same review). */
export function Estimate({ review }) {
  const api = useAdsCoach();
  const b = review?.budget;
  if (!b?.daily) return null;
  const fmt = (n) => api.money(n, n < 10 ? 2 : 0);
  return (
    <section className="rounded-md border border-app-border bg-app-surface px-4 py-3" aria-label="Estimated results">
      <h3 className="m-0 text-[14px] font-semibold">Estimated results</h3>
      <p className="m-0 mt-2 text-[22px] font-semibold tabular-nums leading-none">
        {b.weeklyResults ?? "—"} <span className="text-[13px] font-normal text-ink-muted">{b.weeklyResults === 1 ? b.result : b.results || `${b.result}s`} a week</span>
      </p>
      <dl className="m-0 mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[12.5px]">
        <dt className="text-ink-muted">Daily budget</dt>
        <dd className="m-0 text-right tabular-nums">{fmt(b.daily)}</dd>
        <dt className="text-ink-muted">Cost per {b.result}</dt>
        <dd className="m-0 text-right tabular-nums">≈ {fmt(b.costPerResult)}</dd>
        <dt className="text-ink-muted">Least per ad set</dt>
        <dd className="m-0 text-right tabular-nums">{fmt(b.minPerAdSet)} a day</dd>
      </dl>
      <p className="m-0 mt-2 text-[11.5px] text-ink-subtle">{b.costSource === "account" ? "Based on this ad account's last 30 days." : "Typical for a new ad account; it settles once results come in."} Not a guarantee.</p>
    </section>
  );
}
