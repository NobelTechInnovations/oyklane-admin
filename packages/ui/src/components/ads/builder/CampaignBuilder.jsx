"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Drawer, Dropdown, Form, Segmented, Select, Space, Spin, Tag } from "antd";
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, FolderClosed, LayoutGrid, MessageSquare, MoreHorizontal, Plus, RectangleHorizontal, Rocket, Wallet } from "lucide-react";
import { useAdsCoach } from "../context";
import { AdForm } from "./AdForm";
import { AdPreview } from "./AdPreview";
import { AdSetForm } from "./AdSetForm";
import { AudienceMeter } from "./AudienceMeter";
import { BudgetForm, CampaignForm } from "./CampaignForms";
import { Estimate, Recommendations, useReview } from "./Recommendations";
import { Note, Section, useWide } from "./parts";
import { STEP_OF, blankAd, blankAdSet, blankSpec, copyAd, copyAdSet, errorsAt, nodesOf, sameNode } from "./model";

const nodeKey = (n) => [n.type, n.i, n.j].filter((x) => x !== undefined).join(":");
const ICON = { campaign: FolderClosed, budget: Wallet, adset: LayoutGrid, ad: RectangleHorizontal, review: ClipboardCheck };

function labelOf(spec, n) {
  if (n.type === "campaign") return spec.campaign.name || "New campaign";
  if (n.type === "budget") return "Budget & schedule";
  if (n.type === "adset") return spec.adSets[n.i]?.name || `Ad set ${n.i + 1}`;
  if (n.type === "ad") return spec.adSets[n.i]?.ads[n.j]?.name || `Ad ${n.j + 1}`;
  return "Review and publish";
}

function TreeItem({ spec, n, node, check, go, depth = 0, menu }) {
  const on = sameNode(n, node);
  const Icon = ICON[n.type];
  const errs = errorsAt(check, spec, n);
  return (
    <div
      role="treeitem"
      aria-selected={on}
      tabIndex={0}
      onClick={() => go(n)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), go(n))}
      className={`group flex cursor-pointer items-center gap-2 rounded py-1.5 pr-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent ${on ? "bg-accent-soft font-medium text-accent" : "text-ink hover:bg-app-bg"}`}
      style={{ paddingLeft: 8 + depth * 18 }}
    >
      <Icon size={14} className={`shrink-0 ${on ? "" : "text-ink-subtle"}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{labelOf(spec, n)}</span>
      {errs > 0 && (
        <span className="rounded-full bg-status-danger px-1.5 text-[10.5px] font-semibold leading-4 text-white" aria-label={`${errs} to fix`}>
          {errs}
        </span>
      )}
      {menu && (
        <Dropdown menu={menu} trigger={["click"]}>
          <button type="button" className="grid h-6 w-6 place-items-center rounded text-ink-subtle opacity-0 hover:bg-white group-hover:opacity-100 focus:opacity-100" onClick={(e) => e.stopPropagation()} aria-label={`More for ${labelOf(spec, n)}`}>
            <MoreHorizontal size={14} aria-hidden="true" />
          </button>
        </Dropdown>
      )}
    </div>
  );
}

/** Campaign → ad sets → ads, like Ads Manager's editing tree. */
function Tree({ spec, node, check, go, act }) {
  const head = (text) => <p className="m-0 px-2 pb-1 pt-3 text-[11.5px] font-medium text-ink-subtle first:pt-0">{text}</p>;
  return (
    <div role="tree" aria-label="Campaign structure" className="flex flex-col gap-0.5">
      {head("Campaign")}
      <TreeItem spec={spec} n={{ type: "campaign" }} node={node} check={check} go={go} />
      <TreeItem spec={spec} n={{ type: "budget" }} node={node} check={check} go={go} depth={1} />
      {head("Ad sets and ads")}
      {spec.adSets.map((s, i) => (
        <Fragment key={s.key}>
          <TreeItem
            spec={spec}
            n={{ type: "adset", i }}
            node={node}
            check={check}
            go={go}
            menu={{
              items: [
                { key: "ad", label: "Add an ad" },
                { key: "copy", label: "Duplicate ad set", disabled: spec.adSets.length >= 20 },
                { type: "divider" },
                { key: "delete", label: "Delete ad set", danger: true, disabled: spec.adSets.length === 1 },
              ],
              onClick: ({ key, domEvent }) => {
                domEvent.stopPropagation();
                act[key === "ad" ? "addAd" : key === "copy" ? "copySet" : "removeSet"](i);
              },
            }}
          />
          {s.ads.map((a, j) => (
            <TreeItem
              key={a.key}
              spec={spec}
              n={{ type: "ad", i, j }}
              node={node}
              check={check}
              go={go}
              depth={1}
              menu={{
                items: [
                  { key: "copy", label: "Duplicate ad", disabled: s.ads.length >= 50 },
                  { key: "delete", label: "Delete ad", danger: true, disabled: s.ads.length === 1 },
                ],
                onClick: ({ key, domEvent }) => {
                  domEvent.stopPropagation();
                  act[key === "copy" ? "copyAd" : "removeAd"](i, j);
                },
              }}
            />
          ))}
        </Fragment>
      ))}
      <Button type="link" size="small" className="!justify-start !px-2" icon={<Plus size={13} aria-hidden="true" />} disabled={spec.adSets.length >= 20} onClick={act.addSet}>
        Add ad set
      </Button>
      {head("Publish")}
      <TreeItem spec={spec} n={{ type: "review" }} node={node} check={check} go={go} />
    </div>
  );
}

/** Where a problem from /check is fixed. */
function nodeForProblem(spec, at) {
  if (at === "campaign") return { type: "campaign" };
  if (at === "adsets") return { type: "adset", i: 0 };
  if (at.startsWith("adset:")) {
    const i = spec.adSets.findIndex((s, k) => String(s.key ?? k) === at.slice(6));
    return i >= 0 ? { type: "adset", i } : null;
  }
  if (at.startsWith("ad:")) {
    const key = at.slice(3);
    for (const [i, s] of spec.adSets.entries()) {
      const j = s.ads.findIndex((a, k) => String(a.key ?? `${i}-${k}`) === key);
      if (j >= 0) return { type: "ad", i, j };
    }
  }
  return null;
}

function Review({ spec, check, caps, go, money }) {
  const c = spec.campaign;
  const shared = c.budgetLevel === "campaign";
  return (
    <>
      <Section title="Before you publish">
        {check === null ? (
          <Spin />
        ) : check.errors.length ? (
          <div className="flex flex-col gap-2">
            <p className="m-0 text-[13px] font-medium text-status-danger">
              {check.errors.length} thing{check.errors.length === 1 ? "" : "s"} to fix
            </p>
            <ul className="m-0 flex list-none flex-col divide-y divide-app-border rounded-md border border-app-border p-0">
              {check.errors.map((e, k) => {
                const to = nodeForProblem(spec, e.at);
                return (
                  <li key={k} className="flex items-start justify-between gap-3 px-3 py-2 text-[13px]">
                    <span>{e.text}</span>
                    {to && (
                      <Button size="small" type="link" className="!h-auto !px-0" onClick={() => go(to)}>
                        Fix
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <Alert type="success" showIcon message="Ready to publish" description="Everything is created paused: nothing spends until it's turned on. Meta then reviews each ad, usually within a day." />
        )}
        {check?.warnings?.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message="Worth a look"
            description={
              <ul className="m-0 pl-4">
                {check.warnings.map((w, k) => (
                  <li key={k}>{w.text}</li>
                ))}
              </ul>
            }
          />
        )}
      </Section>
      <Section title="Summary">
        <dl className="m-0 grid grid-cols-[140px_1fr] gap-x-4 gap-y-1.5 text-[13px]">
          <dt className="text-ink-muted">Campaign</dt>
          <dd className="m-0 font-medium">{c.name || "Untitled"}</dd>
          <dt className="text-ink-muted">Objective</dt>
          <dd className="m-0">{caps.objectives[c.objective]?.label}</dd>
          <dt className="text-ink-muted">Budget</dt>
          <dd className="m-0">{shared ? `${money(c.budget)} ${c.budgetType === "daily" ? "a day" : "in total"}, shared by the ad sets` : "Set on each ad set"}</dd>
        </dl>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-app-border text-left text-[12px] text-ink-muted">
                <th className="py-1.5 pr-3 font-medium">Ad set</th>
                <th className="py-1.5 pr-3 font-medium">Performance goal</th>
                {!shared && <th className="py-1.5 pr-3 text-right font-medium">Budget</th>}
                <th className="py-1.5 text-right font-medium">Ads</th>
              </tr>
            </thead>
            <tbody>
              {spec.adSets.map((s, i) => (
                <tr key={s.key} className="border-b border-app-border last:border-b-0">
                  <td className="py-1.5 pr-3">
                    <button type="button" className="text-left text-accent hover:underline" onClick={() => go({ type: "adset", i })}>
                      {s.name}
                    </button>
                  </td>
                  <td className="py-1.5 pr-3">{caps.goals[s.goal]?.label}</td>
                  {!shared && <td className="py-1.5 pr-3 text-right tabular-nums">{money(s.budget)}</td>}
                  <td className="py-1.5 text-right tabular-nums">{s.ads.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note>Every ad links back with tracking (utm_source=facebook and the campaign ID), so the store counts orders from these ads separately from Meta&apos;s numbers.</Note>
      </Section>
    </>
  );
}

/**
 * The campaign builder, laid out like Meta Ads Manager: the campaign → ad
 * sets → ads tree on the left, the selected part's settings in the middle,
 * and on the right the live ad preview, audience size or estimated
 * results, plus the opportunity score. Drafts save as you go; publishing
 * creates everything paused.
 *
 * Shared by the seller dashboard and Super admin ▸ Ads Manager (AdsCoachProvider).
 */
export function CampaignBuilder({ open, onClose, draftId: initialDraftId, onPublished, storeUrl, caps, onAsk }) {
  const api = useAdsCoach();
  const { message, modal } = App.useApp();
  const [advanced, setAdvanced] = useState(false);
  const [spec, setSpec] = useState(null);
  const [node, setNode] = useState({ type: "campaign" });
  const [draftId, setDraftId] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [check, setCheck] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(null);
  const dirty = useRef(false);
  const wideNav = useWide("(min-width: 1024px)");
  const wideRail = useWide("(min-width: 1280px)");
  const money = useCallback((n) => api.money(n), [api]);

  useEffect(() => {
    if (!open || !caps) return;
    setNode({ type: "campaign" });
    setCheck(null);
    setPublished(null);
    dirty.current = false;
    if (initialDraftId) {
      api
        .request(`/drafts/${initialDraftId}`)
        .then(({ draft }) => {
          setSpec(draft.data);
          setDraftId(draft.id);
        })
        .catch((err) => message.error(err.message));
    } else {
      setSpec(blankSpec(caps, storeUrl));
      setDraftId(null);
    }
  }, [open, caps, initialDraftId, storeUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = useCallback((fn) => {
    dirty.current = true;
    setSpec((s) => (typeof fn === "function" ? fn(s) : fn));
  }, []);

  // Autosave a moment after the last change.
  useEffect(() => {
    if (!open || !spec || !dirty.current) return undefined;
    setSaveState("pending");
    const t = setTimeout(async () => {
      try {
        if (draftId) await api.request(`/drafts/${draftId}`, { method: "PUT", body: { data: spec } });
        else {
          const { draft } = await api.request("/drafts", { method: "POST", body: { data: spec } });
          setDraftId(draft.id);
        }
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [spec, open, draftId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Problems Meta would reject, as you go (checked locally by the API, no Meta call).
  const runCheck = useCallback(async () => {
    if (!spec) return null;
    const r = await api.request("/check", { method: "POST", body: spec }).catch(() => null);
    setCheck(r);
    return r;
  }, [spec]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!spec) return undefined;
    const t = setTimeout(runCheck, 700);
    return () => clearTimeout(t);
  }, [spec, runCheck]);

  const { review, failed } = useReview(open ? spec : null);
  const nodes = useMemo(() => (spec ? nodesOf(spec) : []), [spec]);
  const index = nodes.findIndex((n) => sameNode(n, node));
  const go = useCallback((n) => {
    setNode(n);
    document.getElementById("ads-builder-main")?.scrollTo({ top: 0 });
  }, []);

  const updateSet = (i, patch) => set((s) => ({ ...s, adSets: s.adSets.map((a, k) => (k === i ? { ...a, ...patch } : a)) }));
  const updateAd = (i, j, patch) => set((s) => ({ ...s, adSets: s.adSets.map((a, k) => (k === i ? { ...a, ads: a.ads.map((x, m) => (m === j ? { ...x, ...patch } : x)) } : a)) }));
  const act = {
    addSet: () => {
      const i = spec.adSets.length;
      set((s) => ({ ...s, adSets: [...s.adSets, blankAdSet(caps, s.campaign.objective, storeUrl, s.adSets.length + 1)] }));
      go({ type: "adset", i });
    },
    copySet: (i) => {
      set((s) => ({ ...s, adSets: [...s.adSets.slice(0, i + 1), copyAdSet(s.adSets[i], `${s.adSets[i].name} copy`), ...s.adSets.slice(i + 1)] }));
      go({ type: "adset", i: i + 1 });
    },
    removeSet: (i) => {
      set((s) => ({ ...s, adSets: s.adSets.filter((_, k) => k !== i) }));
      go({ type: "adset", i: Math.max(0, i - 1) });
    },
    addAd: (i) => {
      const j = spec.adSets[i].ads.length;
      set((s) => ({ ...s, adSets: s.adSets.map((a, k) => (k === i ? { ...a, ads: [...a.ads, blankAd(caps, storeUrl, a.ads.length + 1)] } : a)) }));
      go({ type: "ad", i, j });
    },
    copyAd: (i, j) => {
      set((s) => ({ ...s, adSets: s.adSets.map((a, k) => (k === i ? { ...a, ads: [...a.ads.slice(0, j + 1), copyAd(a.ads[j], `${a.ads[j].name} copy`), ...a.ads.slice(j + 1)] } : a)) }));
      go({ type: "ad", i, j: j + 1 });
    },
    removeAd: (i, j) => {
      set((s) => ({ ...s, adSets: s.adSets.map((a, k) => (k === i ? { ...a, ads: a.ads.filter((_, m) => m !== j) } : a)) }));
      go({ type: "adset", i });
    },
  };

  async function doPublish() {
    const r = await runCheck();
    if (!r?.ok) return message.error("Fix the problems listed first.");
    modal.confirm({
      title: "Publish to Meta?",
      icon: <Rocket size={18} aria-hidden="true" />,
      content: "This creates the campaign, ad sets and ads in the ad account, all paused. Nothing spends until it's turned on. Meta then reviews each ad, usually within a day.",
      okText: "Publish",
      onOk: async () => {
        setPublishing(true);
        try {
          if (draftId) await api.request(`/drafts/${draftId}`, { method: "PUT", body: { data: spec } });
          const id = draftId || (await api.request("/drafts", { method: "POST", body: { data: spec } })).draft.id;
          setDraftId(id);
          const out = await api.request(`/drafts/${id}/publish`, { method: "POST", body: { confirm: true } });
          setPublished({ ...out, draftId: id });
          onPublished?.();
        } catch (err) {
          modal.error({
            title: "Publishing stopped",
            content: (
              <div>
                <p>{err.message}</p>
                <p className="m-0 text-xs text-ink-muted">Everything created so far is kept, paused. Fix this and publish again: it carries on without duplicating.</p>
              </div>
            ),
          });
        } finally {
          setPublishing(false);
        }
      },
    });
  }

  function launch() {
    const total = spec.campaign.budgetLevel === "campaign" ? Number(spec.campaign.budget) : spec.adSets.reduce((n, a) => n + Number(a.budget || 0), 0);
    modal.confirm({
      title: "Turn the campaign on?",
      content: `It can spend up to ${money(total)} ${spec.campaign.budgetType === "daily" ? "a day" : "in total"}, charged by Meta to the ad account. Ads start once Meta approves them.`,
      okText: "Turn on",
      onOk: async () => {
        try {
          await api.request(`/drafts/${published.draftId}/launch`, { method: "POST", body: { confirm: true } });
          message.success("Turned on. Ads start after Meta's review.");
          onClose();
        } catch (err) {
          message.error(err.message);
        }
      },
    });
  }

  if (!open) return null;
  const ready = caps && spec && nodes.length;
  const current = ready ? (index >= 0 ? node : { type: "campaign" }) : null;
  const adSet = current?.type === "adset" || current?.type === "ad" ? spec.adSets[current.i] : null;
  const ad = current?.type === "ad" ? adSet?.ads[current.j] : null;
  const step = current ? STEP_OF[current.type] : 0;

  const rail = ready && (
    <div className="flex flex-col gap-3">
      {current.type === "ad" && ad && <AdPreview ad={ad} caps={caps} goal={adSet.goal} />}
      {current.type === "adset" && adSet && <AudienceMeter adSet={adSet} specialAdCategories={spec.campaign.specialAdCategories} />}
      {(current.type === "campaign" || current.type === "budget" || current.type === "review") && <Estimate review={review} />}
      {current.type !== "review" && <Recommendations spec={spec} step={step} review={review} failed={failed} onApply={(next) => set(next)} />}
    </div>
  );

  const saveText = { saved: "Draft saved", pending: "Saving…", error: "Couldn't save the draft" }[saveState] || "Draft";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="min(1440px, 100vw)"
      destroyOnHidden
      styles={{ body: { padding: 0, display: "flex", flexDirection: "column" }, header: { padding: "12px 16px" }, footer: { padding: "10px 16px" } }}
      title={
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[15px] font-semibold">{spec?.campaign?.name || "New campaign"}</span>
          <Tag className="!m-0 shrink-0" color={saveState === "error" ? "red" : undefined}>
            {saveText}
          </Tag>
        </span>
      }
      extra={
        <Space size={8}>
          {onAsk && (
            <Button size="small" icon={<MessageSquare size={13} aria-hidden="true" />} onClick={() => onAsk({ kind: "builder", screen: "Campaign builder", step: labelOf(spec || { campaign: {}, adSets: [] }, current || { type: "campaign" }), draft: spec })}>
              Ask AI
            </Button>
          )}
          <Segmented size="small" value={advanced ? "advanced" : "simple"} onChange={(v) => setAdvanced(v === "advanced")} options={[{ value: "simple", label: "Simple" }, { value: "advanced", label: "Advanced" }]} />
        </Space>
      }
      footer={
        ready && !published ? (
          <div className="flex items-center justify-between gap-3">
            <Button icon={<ChevronLeft size={14} aria-hidden="true" />} disabled={index <= 0} onClick={() => go(nodes[index - 1])}>
              Back
            </Button>
            <span className="hidden text-[12px] text-ink-muted sm:inline">{check?.errors?.length ? `${check.errors.length} to fix before publishing` : "No problems found"}</span>
            {current.type === "review" ? (
              <Button type="primary" icon={<Rocket size={14} aria-hidden="true" />} loading={publishing} disabled={!check?.ok} onClick={doPublish}>
                Publish
              </Button>
            ) : (
              <Button type="primary" onClick={() => go(nodes[index + 1])}>
                Next <ChevronRight size={14} className="inline align-[-2px]" aria-hidden="true" />
              </Button>
            )}
          </div>
        ) : null
      }
    >
      {!ready ? (
        <div className="grid flex-1 place-items-center">
          <Spin />
        </div>
      ) : published ? (
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <CheckCircle2 size={40} className="mx-auto text-status-success" aria-hidden="true" />
          <h3 className="mt-3 text-lg font-semibold">Published, paused</h3>
          <p className="text-sm text-ink-muted">
            Created 1 campaign, {published.adSets} ad set{published.adSets === 1 ? "" : "s"} and {published.ads} ad{published.ads === 1 ? "" : "s"} in the ad account. Turn it on when you&apos;re ready; Meta reviews each ad first.
          </p>
          <Space>
            <Button onClick={onClose}>Keep it paused</Button>
            <Button type="primary" icon={<Rocket size={14} aria-hidden="true" />} onClick={launch}>
              Turn on now
            </Button>
          </Space>
        </div>
      ) : (
        <Form layout="vertical" requiredMark={false} component="div" className="flex min-h-0 flex-1">
          {wideNav && (
            <nav className="w-60 shrink-0 overflow-y-auto border-r border-app-border bg-app-surface px-2 py-3" aria-label="Campaign structure">
              <Tree spec={spec} node={current} check={check} go={go} act={act} />
            </nav>
          )}
          <main id="ads-builder-main" className="min-w-0 flex-1 overflow-y-auto bg-app-bg">
            <div className="mx-auto flex max-w-[760px] flex-col gap-3 px-4 py-4 sm:px-6">
              {!wideNav && (
                <div className="flex items-center gap-2">
                  <Select className="min-w-0 flex-1" value={nodeKey(current)} onChange={(k) => go(nodes.find((n) => nodeKey(n) === k))} options={nodes.map((n) => ({ value: nodeKey(n), label: `${n.type === "ad" ? "— " : ""}${labelOf(spec, n)}` }))} aria-label="Part of the campaign" />
                  <Button icon={<Plus size={14} aria-hidden="true" />} onClick={act.addSet} disabled={spec.adSets.length >= 20} aria-label="Add ad set" />
                </div>
              )}
              {current.type === "campaign" && <CampaignForm spec={spec} set={set} caps={caps} advanced={advanced} />}
              {current.type === "budget" && <BudgetForm spec={spec} set={set} caps={caps} advanced={advanced} />}
              {current.type === "adset" && adSet && <AdSetForm key={adSet.key} adSet={adSet} update={(p) => updateSet(current.i, p)} caps={caps} campaign={spec.campaign} advanced={advanced} />}
              {current.type === "ad" && ad && <AdForm key={ad.key} ad={ad} update={(p) => updateAd(current.i, current.j, p)} caps={caps} goal={adSet.goal} advanced={advanced} storeUrl={storeUrl} />}
              {current.type === "review" && (
                <>
                  <Review spec={spec} check={check} caps={caps} go={go} money={money} />
                  <Recommendations spec={spec} step={4} review={review} failed={failed} onApply={(next) => set(next)} all />
                </>
              )}
              {!wideRail && <div className="mt-2">{rail}</div>}
            </div>
          </main>
          {wideRail && <aside className="w-[340px] shrink-0 overflow-y-auto border-l border-app-border bg-app-bg px-4 py-4">{rail}</aside>}
        </Form>
      )}
    </Drawer>
  );
}
