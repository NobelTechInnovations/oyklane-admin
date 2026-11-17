"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Button, Progress, Skeleton, Tooltip } from "antd";
import { AlertTriangle, CheckCircle2, Lightbulb, MessageSquare, Sparkles, Wand2 } from "lucide-react";
import { useAdsCoach } from "./context";

// What to decide on each step of the campaign builder.
const GUIDE = [
  {
    title: "Choose what the ads should do",
    points: ["Sales finds buyers, and needs the Meta Pixel on the store.", "WhatsApp chats suit products people ask about before buying.", "Traffic brings visitors cheaply, but they may not buy."],
  },
  {
    title: "Set the budget and dates",
    points: ["Pick an amount you can leave alone for a week.", "One shared campaign budget lets Meta move money to what works; A/B tests need equal ad set budgets.", "Change budgets by about 20% at a time, every 3–4 days."],
  },
  {
    title: "Decide who sees the ads",
    points: ["Start broad (Advantage+ audience) unless you know exactly who buys.", "Each ad set should reach different people, or they compete.", "Retarget past visitors in a separate, small ad set."],
  },
  {
    title: "Make the ads",
    points: ["2–4 ads per ad set, with different photos or first lines.", "First line under 125 characters, headline under 40.", "Send people to the product they saw. Vertical video helps on Reels and Stories."],
  },
  {
    title: "Check and publish",
    points: ["Fix anything marked to fix first.", "It publishes paused: nothing spends until you turn it on.", "Leave it a few days before judging results."],
  },
];

const LEVEL = {
  warn: { Icon: AlertTriangle, tone: "text-status-warning", label: "Fix" },
  tip: { Icon: Lightbulb, tone: "text-accent", label: "Tip" },
  good: { Icon: CheckCircle2, tone: "text-status-success", label: "Good" },
};

// Image previews make the request big and don't change the advice.
const lean = (spec) => JSON.stringify(spec, (k, v) => (/Preview$/.test(k) ? undefined : v));

function Suggestion({ s, busy, onFix }) {
  const { Icon, tone, label } = LEVEL[s.level] || LEVEL.tip;
  return (
    <div className="rounded-md border border-app-border p-2.5">
      <p className="m-0 flex items-start gap-1.5 text-[13px] font-medium">
        <Icon size={14} className={`${tone} mt-0.5 shrink-0`} aria-label={label} />
        {s.title}
      </p>
      <p className="m-0 mt-1 text-xs text-ink-muted">{s.text}</p>
      {s.fix && (
        <Button size="small" className="mt-2" icon={<Wand2 size={12} aria-hidden="true" />} loading={busy === s.fix.kind} onClick={() => onFix(s.fix)}>
          {s.fix.label}
        </Button>
      )}
    </div>
  );
}

function BudgetMeter({ b, money }) {
  const fmt = (n) => money(n, n < 10 ? 2 : 0);
  return (
    <div className="rounded-md bg-app-bg p-2.5 text-xs">
      <p className="m-0">
        <b>{fmt(b.daily)}</b> a day ≈ <b>{b.weeklyResults}</b> {b.weeklyResults === 1 ? b.result : b.results || `${b.result}s`} a week
      </p>
      <p className="m-0 mt-0.5 text-ink-muted">
        At about {fmt(b.costPerResult)} each ({b.costSource === "account" ? "this ad account's last 30 days" : "typical for a new account"}). Give each ad set at least {fmt(b.minPerAdSet)} a day.
      </p>
    </div>
  );
}

/**
 * The coach beside the campaign builder: what to decide on this step, the
 * campaign's checks (from POST /coach/review, as it changes) and one-click
 * fixes. `onApply(spec)` takes a fixed campaign; `onAsk` opens the chat.
 */
export function AdsCoachPanel({ spec, step, onApply, onAsk }) {
  const api = useAdsCoach();
  const { message } = App.useApp();
  const [review, setReview] = useState(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(null);
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

  async function fix(f) {
    setBusy(f.kind);
    try {
      const { spec: next } = await api.request("/coach/fix", { method: "POST", body: { spec, kind: f.kind } });
      onApply(next);
      message.success(`${f.label}: done`);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  const guide = GUIDE[step] || GUIDE[0];
  const all = review?.suggestions || [];
  const here = step === 4 ? all : all.filter((s) => s.step === step);
  const later = step === 4 ? [] : all.filter((s) => s.step !== step && s.level !== "good");
  const scoreColor = review ? (review.score >= 85 ? "#16A34A" : review.score >= 65 ? "#0078d4" : "#D97706") : undefined;

  return (
    <aside className="flex flex-col gap-3 rounded-lg border border-app-border bg-app-surface p-3" aria-label="Coach">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          <Sparkles size={15} className="text-accent" aria-hidden="true" />
          Coach
        </span>
        {review && (
          <Tooltip title="How well the campaign is set up. It goes up as you follow the suggestions.">
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
              <Progress type="circle" percent={review.score} size={30} strokeColor={scoreColor} format={(p) => p} />
              {review.grade}
            </span>
          </Tooltip>
        )}
      </div>
      <div>
        <p className="m-0 text-[13px] font-medium">{guide.title}</p>
        <ul className="m-0 mt-1 pl-4 text-xs text-ink-muted">
          {guide.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
      {step === 1 && review?.budget?.daily > 0 && <BudgetMeter b={review.budget} money={api.money} />}
      {!review && !failed && <Skeleton active title={false} paragraph={{ rows: 3 }} />}
      {failed && !review && <p className="m-0 text-xs text-ink-muted">Couldn&apos;t check the campaign just now.</p>}
      {here.map((s) => (
        <Suggestion key={s.id} s={s} busy={busy} onFix={fix} />
      ))}
      {review && !here.length && (
        <p className="m-0 inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
          <CheckCircle2 size={14} className="text-status-success" aria-hidden="true" />
          Nothing to change on this step.
        </p>
      )}
      {later.length > 0 && (
        <p className="m-0 text-xs text-ink-muted">
          {later.length} more suggestion{later.length === 1 ? "" : "s"} on other steps — all are listed on Review.
        </p>
      )}
      {onAsk && (
        <Button size="small" icon={<MessageSquare size={13} aria-hidden="true" />} onClick={onAsk}>
          Ask the coach
        </Button>
      )}
    </aside>
  );
}
