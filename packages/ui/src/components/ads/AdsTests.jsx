"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Card, Dropdown, Empty, Skeleton, Table, Tag } from "antd";
import { FlaskConical, MessageSquare, Trophy } from "lucide-react";
import { useAdsCoach } from "./context";

const VERDICT = {
  winner: { color: "green", label: "Winner found", alert: "success" },
  leaning: { color: "blue", label: "One is ahead", alert: "info" },
  too_early: { color: "default", label: "Too early", alert: "info" },
  too_close: { color: "gold", label: "Too close to call", alert: "warning" },
  no_data: { color: "default", label: "Waiting for results", alert: "info" },
  not_started: { color: "default", label: "Not published", alert: "info" },
  decided: { color: "green", label: "Decided", alert: "success" },
};
const STATUS = { ACTIVE: "On", PAUSED: "Paused", CAMPAIGN_PAUSED: "Campaign paused", ADSET_PAUSED: "Paused", WITH_ISSUES: "Has issues", IN_PROCESS: "Processing", DELETED: "Deleted", ARCHIVED: "Archived" };
const WORD = { cpa: "Purchases", cost_per_chat: "Chats", cpl: "Leads", cpc: "Clicks", ctr: "Clicks", roas: "Purchases" };

function TestCard({ t, onDone, onAsk }) {
  const api = useAdsCoach();
  const { message, modal } = App.useApp();
  const v = VERDICT[t.verdict.status] || VERDICT.too_early;
  const pick = t.verdict.winnerKey || t.verdict.leaderKey;
  const fmt = (n) => (n == null ? "—" : api.money(n, n < 10 ? 2 : 0));
  const decidable = api.canEdit && t.verdict.status !== "decided" && t.verdict.status !== "not_started" && t.versions.filter((x) => x.adSetId).length >= 2;

  const keep = (version) =>
    modal.confirm({
      title: `Keep "${version.label}" and pause the others?`,
      content:
        t.verdict.status === "winner" && version.key === pick
          ? "The other versions' ad sets are paused. You can turn them back on any time."
          : "The results don't clearly favour this version yet, so the difference may be chance. The others' ad sets are paused; you can turn them back on any time.",
      okText: "Keep it",
      onOk: async () => {
        try {
          const r = await api.request(`/coach/tests/${t.draftId}/winner`, { method: "POST", body: { key: version.key } });
          message.success(`Kept "${version.label}", paused ${r.paused} other${r.paused === 1 ? "" : "s"}`);
          onDone();
        } catch (err) {
          message.error(err.message);
        }
      },
    });

  const ordered = [...t.versions].sort((a, b) => (b.key === pick) - (a.key === pick));
  return (
    <Card
      size="small"
      title={
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <FlaskConical size={14} className="shrink-0 text-accent" aria-hidden="true" />
          <span className="truncate">{t.name || t.campaign}</span>
        </span>
      }
      extra={<Tag color={v.color} className="!m-0">{v.label}</Tag>}
    >
      <p className="m-0 text-xs text-ink-muted">
        {t.kind === "audience" ? "Audience test" : "Ad test"} in &ldquo;{t.campaign}&rdquo; · judged on {t.metricLabel.toLowerCase()}
        {t.startedAt ? ` · day ${t.days + 1} (run at least ${t.minDays})` : ""}
      </p>
      {t.hypothesis && <p className="m-0 mt-1 text-xs">Idea being tested: {t.hypothesis}</p>}
      <Alert className="!mt-3" type={v.alert} showIcon icon={t.verdict.status === "winner" || t.verdict.status === "decided" ? <Trophy size={16} aria-hidden="true" /> : undefined} message={t.verdict.text} />
      <Table
        className="mt-3"
        size="small"
        rowKey="key"
        pagination={false}
        scroll={{ x: 640 }}
        dataSource={t.versions}
        rowClassName={(r) => (r.key === pick ? "bg-accent-soft" : "")}
        columns={[
          {
            title: "Version",
            key: "v",
            render: (_, r) => (
              <span className="inline-flex items-center gap-1.5">
                <Tag className="!m-0">{r.letter}</Tag>
                <span>{r.label}</span>
                {r.key === pick && (t.verdict.status === "winner" || t.verdict.status === "decided") && <Tag color="green" className="!m-0">Best</Tag>}
              </span>
            ),
          },
          { title: "Status", dataIndex: "status", render: (s) => STATUS[s] || (s ? String(s).toLowerCase().replace(/_/g, " ") : "—") },
          { title: "Spend", dataIndex: "spend", align: "right", render: fmt },
          { title: WORD[t.metric] || "Results", dataIndex: "results", align: "right", render: (n) => Number(n || 0).toLocaleString() },
          t.metric === "ctr" ? { title: "Click rate", dataIndex: "ctr", align: "right", render: (n) => (n == null ? "—" : `${n}%`) } : { title: t.metricLabel, dataIndex: "cost", align: "right", render: fmt },
          ...(t.metric !== "ctr" ? [{ title: "Click rate", dataIndex: "ctr", align: "right", render: (n) => (n == null ? "—" : `${n}%`) }] : []),
          ...(t.versions.some((x) => x.purchases) ? [{ title: "ROAS", dataIndex: "roas", align: "right", render: (n) => (n ? `${n}×` : "—") }] : []),
        ]}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {decidable && pick && (
          <Button type={t.verdict.status === "winner" ? "primary" : "default"} icon={<Trophy size={14} aria-hidden="true" />} onClick={() => keep(t.versions.find((x) => x.key === pick))}>
            Keep &ldquo;{t.versions.find((x) => x.key === pick)?.label}&rdquo;, pause the others
          </Button>
        )}
        {decidable && (
          <Dropdown menu={{ items: ordered.filter((x) => x.key !== pick && x.adSetId).map((x) => ({ key: x.key, label: `Keep ${x.letter}: ${x.label}` })), onClick: ({ key }) => keep(t.versions.find((x) => x.key === key)) }} trigger={["click"]}>
            <Button>Keep another version</Button>
          </Dropdown>
        )}
        {onAsk && (
          <Button icon={<MessageSquare size={14} aria-hidden="true" />} onClick={() => onAsk({ kind: "tests", screen: "A/B tests", data: { test: t.name || t.campaign, kind: t.kind, metric: t.metricLabel, days: t.days, verdict: t.verdict.text, versions: t.versions.map(({ letter, label, spend, results, cost, ctr, roas, status }) => ({ letter, label, spend, results, cost, ctr, roas, status })) } })}>
            Ask the coach
          </Button>
        )}
      </div>
    </Card>
  );
}

/**
 * A/B tests on this ad account (campaigns planned with a test): results
 * per version, a verdict that waits for enough data, and "keep the winner"
 * (pauses the other versions).
 */
export function AdsTests({ onPlan, onAsk }) {
  const api = useAdsCoach();
  const [tests, setTests] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => {
    api
      .request("/coach/tests")
      .then((d) => {
        setTests(d.tests);
        setError(null);
      })
      .catch((err) => setError(err.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [load]);

  if (error) return <Alert type="error" showIcon message="Couldn't load the A/B tests" description={error} action={<Button size="small" onClick={load}>Retry</Button>} />;
  if (!tests) return <Skeleton active />;
  if (!tests.length)
    return (
      <Card size="small">
        <Empty
          image={<FlaskConical size={36} className="mx-auto text-ink-subtle" aria-hidden="true" />}
          description={
            <span className="text-sm text-ink-muted">
              No A/B tests yet. An A/B test runs two or three versions side by side — different audiences, or different ads — with equal budgets, then shows which one wins.
            </span>
          }
        >
          {onPlan && (
            <Button type="primary" onClick={onPlan}>
              Plan a test
            </Button>
          )}
        </Empty>
      </Card>
    );
  return (
    <div className="flex flex-col gap-4">
      {tests.map((t) => (
        <TestCard key={t.draftId} t={t} onDone={load} onAsk={onAsk} />
      ))}
    </div>
  );
}
