"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Segmented, Skeleton, Table } from "antd";
import { AlertTriangle, CheckCircle2, Info, MessageSquare } from "lucide-react";
import { useAdsCoach } from "./context";

const PERIODS = [
  { value: "last_7d", label: "7 days" },
  { value: "last_14d", label: "14 days" },
  { value: "last_30d", label: "30 days" },
  { value: "last_90d", label: "90 days" },
];
const BY = [
  { value: "age_gender", label: "Age & gender" },
  { value: "placement", label: "Placement" },
  { value: "region", label: "Region" },
  { value: "device", label: "Device" },
];
const ACCENT = "#0078d4";
const day = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const count = (n) => (n == null ? "—" : Number(n).toLocaleString());
const pct = (n) => (n == null ? "—" : `${Number(n).toFixed(2)}%`);

/** Bars or a line for one measure by day, with a tooltip on hover or tap
 * and a table for screen readers. One measure per chart. */
function DayChart({ points, kind, format, label }) {
  const [hover, setHover] = useState(null);
  const values = points.map((p) => p.y).filter((v) => v != null);
  if (!values.length) return <div className="flex h-[140px] items-center justify-center text-xs text-ink-muted">No {label.toLowerCase()} in this period</div>;
  const W = 600;
  const H = 140;
  const pad = 6;
  const max = Math.max(...values) || 1;
  const n = points.length;
  const step = W / n;
  const y = (v) => H - pad - (v / max) * (H - pad * 2);
  // A line breaks where a day has no value (e.g. no purchases → no cost per purchase).
  const runs = [];
  if (kind === "line") {
    let run = [];
    points.forEach((p, i) => {
      if (p.y == null) {
        if (run.length) runs.push(run);
        run = [];
      } else run.push(`${i * step + step / 2},${y(p.y)}`);
    });
    if (run.length) runs.push(run);
  }
  const at = hover == null ? null : points[hover];
  const best = points.reduce((a, p) => (p.y != null && (a == null || p.y > a.y) ? p : a), null);
  return (
    <div className="relative select-none">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[140px] w-full" role="img" aria-label={`${label} by day, highest ${format(best.y)} on ${day(best.x)}`} onMouseLeave={() => setHover(null)}>
        <line x1="0" x2={W} y1={H - pad} y2={H - pad} stroke="#E6E6EA" vectorEffect="non-scaling-stroke" />
        {kind === "bar" &&
          points.map((p, i) => (p.y ? <rect key={p.x} x={i * step + step * 0.15} y={y(p.y)} width={step * 0.7} height={H - pad - y(p.y)} rx="2" fill={ACCENT} opacity={hover == null || hover === i ? 1 : 0.5} /> : null))}
        {kind === "line" && runs.map((r) => (r.length > 1 ? <polyline key={r[0]} points={r.join(" ")} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null))}
        {points.map((p, i) => (
          <rect key={`hit-${p.x}`} x={i * step} y="0" width={step} height={H} fill="transparent" onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} />
        ))}
      </svg>
      {kind === "line" && at?.y != null && (
        <span className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent" style={{ left: `${((hover + 0.5) / n) * 100}%`, top: `${(y(at.y) / H) * 140}px` }} />
      )}
      {at && (
        <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-app-border bg-app-surface px-2 py-1 text-[11px] shadow-sm" style={{ left: `${Math.min(85, Math.max(15, ((hover + 0.5) / n) * 100))}%` }}>
          <span className="text-ink-muted">{day(at.x)}</span> <b>{at.y == null ? "—" : format(at.y)}</b>
        </div>
      )}
      <div className="mt-1 flex justify-between text-[11px] text-ink-muted">
        <span>{day(points[0].x)}</span>
        <span>
          Highest {format(best.y)} on {day(best.x)}
        </span>
        <span>{day(points[n - 1].x)}</span>
      </div>
      <table className="sr-only">
        <caption>{label} by day</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.x}>
              <th scope="row">{p.x}</th>
              <td>{p.y == null ? "—" : format(p.y)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Kpi({ label, value, note }) {
  return (
    <div className="rounded-lg border border-app-border bg-app-surface px-3 py-2.5">
      <p className="m-0 text-xs text-ink-muted">{label}</p>
      <p className="m-0 mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
      {note && <p className="m-0 text-[11px] text-ink-subtle">{note}</p>}
    </div>
  );
}

const NOTE = {
  good: { Icon: CheckCircle2, tone: "text-status-success" },
  bad: { Icon: AlertTriangle, tone: "text-status-warning" },
  info: { Icon: Info, tone: "text-accent" },
  ok: { Icon: CheckCircle2, tone: "text-status-success" },
};
function Notes({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {items.map((x) => {
        const { Icon, tone } = NOTE[x.kind] || (x.stage === "ok" ? NOTE.ok : NOTE.bad);
        return (
          <li key={x.text} className="flex items-start gap-2 text-[13px]">
            <Icon size={14} className={`${tone} mt-0.5 shrink-0`} aria-hidden="true" />
            <span>{x.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Funnel({ steps }) {
  return (
    <div className="flex flex-col gap-2" role="table" aria-label="From seeing an ad to buying">
      <div className="grid grid-cols-[minmax(96px,140px)_1fr_auto] gap-3 text-[11px] text-ink-muted" role="row">
        <span role="columnheader">Step</span>
        <span role="columnheader">Share of the step before</span>
        <span role="columnheader" className="text-right">
          People
        </span>
      </div>
      {steps.map((s, i) => (
        <div key={s.key} className="grid grid-cols-[minmax(96px,140px)_1fr_auto] items-center gap-3 text-sm" role="row">
          <span className="text-ink-muted" role="rowheader">
            {s.label}
          </span>
          <span className="flex items-center gap-2" role="cell">
            {i === 0 ? (
              <span className="text-xs text-ink-subtle">—</span>
            ) : (
              <>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-app-bg">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, s.rate || 0)}%` }} />
                </span>
                <span className="w-14 text-right text-xs tabular-nums text-ink-muted">{s.rate == null ? "—" : `${s.rate}%`}</span>
              </>
            )}
          </span>
          <span className="text-right tabular-nums" role="cell">
            {count(s.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function Breakdown({ range, onData }) {
  const api = useAdsCoach();
  const [by, setBy] = useState("age_gender");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let live = true;
    setData(null);
    setError(null);
    api
      .request(`/insights/breakdown?by=${by}&preset=${range}`)
      .then((d) => {
        if (!live) return;
        setData(d);
        onData?.(d);
      })
      .catch((err) => live && setError(err.message));
    return () => {
      live = false;
    };
  }, [by, range]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (n) => (n == null ? "—" : api.money(n, n < 10 ? 2 : 0));
  const sells = data?.total?.purchases > 0;
  return (
    <Card size="small" title="Who and where" extra={<Segmented size="small" value={by} onChange={setBy} options={BY} />}>
      {error ? (
        <Alert type="error" showIcon message="Couldn't load this breakdown" description={error} />
      ) : !data ? (
        <Skeleton active />
      ) : (
        <div className="flex flex-col gap-3">
          <Notes items={data.notes} />
          <Table
            size="small"
            rowKey="key"
            dataSource={data.rows}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            scroll={{ x: 640 }}
            locale={{ emptyText: "No results in this period" }}
            columns={[
              { title: BY.find((b) => b.value === by)?.label, dataIndex: "label" },
              {
                title: "Spend",
                dataIndex: "spend",
                align: "right",
                sorter: (a, b) => a.spend - b.spend,
                render: (n) => (
                  <span className="inline-flex items-center justify-end gap-2">
                    <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-app-bg sm:inline-block" aria-hidden="true">
                      <span className="block h-full bg-accent" style={{ width: `${data.total.spend ? (n / data.total.spend) * 100 : 0}%` }} />
                    </span>
                    {fmt(n)}
                  </span>
                ),
              },
              sells ? { title: "Purchases", dataIndex: "purchases", align: "right", sorter: (a, b) => a.purchases - b.purchases, render: count } : { title: "Clicks", dataIndex: "clicks", align: "right", sorter: (a, b) => a.clicks - b.clicks, render: count },
              sells ? { title: "Cost per purchase", dataIndex: "cpa", align: "right", sorter: (a, b) => (a.cpa ?? 1e12) - (b.cpa ?? 1e12), render: fmt } : { title: "Cost per click", dataIndex: "cpc", align: "right", render: fmt },
              { title: "Click rate", dataIndex: "ctr", align: "right", sorter: (a, b) => a.ctr - b.ctr, render: pct },
              ...(sells ? [{ title: "ROAS", dataIndex: "roas", align: "right", render: (n) => (n ? `${n}×` : "—") }] : []),
            ]}
          />
        </div>
      )}
    </Card>
  );
}

const MEASURES = [
  { value: "purchases", label: "Purchases", kind: "bar" },
  { value: "cpa", label: "Cost per purchase", kind: "line", money: true },
  { value: "ctr", label: "Click rate", kind: "line" },
  { value: "roas", label: "ROAS", kind: "line" },
];

/**
 * Analytics for an ad account: totals, results by day, the funnel from
 * impression to purchase (with where people drop off), and results by age
 * and gender, placement, region and device — each with notes on what to do.
 */
export function AdsAnalytics({ onAsk }) {
  const api = useAdsCoach();
  const [range, setRange] = useState("last_30d");
  const [measure, setMeasure] = useState("purchases");
  const [trend, setTrend] = useState(null);
  const [error, setError] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  useEffect(() => {
    let live = true;
    setTrend(null);
    setError(null);
    api
      .request(`/insights/trend?preset=${range}`)
      .then((d) => live && setTrend(d))
      .catch((err) => live && setError(err.message));
    return () => {
      live = false;
    };
  }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (n) => (n == null ? "—" : api.money(n, n < 10 ? 2 : 0));
  const m = MEASURES.find((x) => x.value === measure);
  const points = useMemo(() => (trend?.days || []).map((d) => ({ x: d.date, y: d[measure] == null || (measure === "roas" && !d.spend) ? null : d[measure] })), [trend, measure]);
  const t = trend?.total;

  const ask = () =>
    onAsk?.({
      kind: "analytics",
      screen: "Analytics",
      range: { preset: range },
      data: { totals: t, funnel: trend?.funnel, dropOff: trend?.diagnosis?.map((x) => x.text), breakdown: breakdown && { by: breakdown.by, notes: breakdown.notes.map((x) => x.text), rows: breakdown.rows.slice(0, 10) } },
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented value={range} onChange={setRange} options={PERIODS} aria-label="Period" />
        {onAsk && (
          <Button icon={<MessageSquare size={14} aria-hidden="true" />} onClick={ask} disabled={!trend}>
            Ask the coach about this
          </Button>
        )}
      </div>
      {error ? (
        <Alert type="error" showIcon message="Couldn't load the results" description={error} />
      ) : !trend ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Spend" value={fmt(t.spend)} />
            <Kpi label="Purchases" value={count(t.purchases)} note="Reported by Meta" />
            <Kpi label="Cost per purchase" value={fmt(t.cpa)} />
            <Kpi label="ROAS" value={t.roas ? `${t.roas}×` : "—"} note="Purchase value ÷ spend" />
            <Kpi label="Click rate" value={pct(t.ctr)} />
            <Kpi label="Cost per click" value={fmt(t.cpc)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card size="small" title="Spend by day">
              <DayChart points={trend.days.map((d) => ({ x: d.date, y: d.spend }))} kind="bar" format={fmt} label="Spend" />
            </Card>
            <Card size="small" title={`${m.label} by day`} extra={<Segmented size="small" value={measure} onChange={setMeasure} options={MEASURES.map(({ value, label }) => ({ value, label }))} />}>
              <DayChart points={points} kind={m.kind} format={m.money ? fmt : measure === "ctr" ? pct : measure === "roas" ? (n) => `${n}×` : count} label={m.label} />
            </Card>
          </div>
          <Card size="small" title="From seeing an ad to buying">
            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <Funnel steps={trend.funnel} />
              <div>
                <p className="m-0 mb-2 text-[13px] font-medium">Where people drop off</p>
                {trend.diagnosis.length ? <Notes items={trend.diagnosis} /> : <p className="m-0 text-[13px] text-ink-muted">Not enough results yet to tell.</p>}
                <p className="m-0 mt-3 text-[11px] text-ink-subtle">Store visits, carts and checkouts come from the Meta Pixel. If a step shows 0, the Pixel may not send that event.</p>
              </div>
            </div>
          </Card>
        </>
      )}
      <Breakdown range={range} onData={setBreakdown} />
      <p className="m-0 text-[11px] text-ink-subtle">Meta&apos;s numbers: purchases by people who clicked an ad in the last 7 days or saw one the day before.</p>
    </div>
  );
}
