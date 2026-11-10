"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, Alert, Card, Tag, Button, App, Skeleton, Select, Popconfirm, Form, Input } from "antd";
import { Megaphone, LineChart, Images, Bot, ShieldCheck, FileClock, CheckCircle2, AlertTriangle, HelpCircle, ExternalLink } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { AccountSignIn, AccountLine } from "@/components/accounts/AccountConnect";
import GCampaigns from "./GCampaigns";
import GInsights from "./GInsights";
import GMedia from "./GMedia";
import GWizard from "./GWizard";
import Automation from "../meta-ads/Automation";

const TABS = ["campaigns", "insights", "media", "automation", "setup"];

const fmtId = (id) => String(id).replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");

/** A Google Ads account made from Oyklane, under Oyklane's manager account
 * (like Shopify does) — the seller accepts Google's emailed invite and adds
 * billing, then picks it above. */
function CreateAccount({ status, google, storeName, onDone }) {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState(status.createdAccount);
  if (!status.canCreate) {
    return (
      <Alert
        type="info"
        showIcon
        message="Create a Google Ads account"
        description={
          <span>
            Make one free at <a href="https://ads.google.com" target="_blank" rel="noreferrer">ads.google.com</a> with this Google login and add a payment method, then click Refresh. If your
            account belongs to someone else, ask them to add your email (Admin ▸ Access and security).
          </span>
        }
      />
    );
  }
  if (made) {
    return (
      <Alert
        type="success"
        showIcon
        message={`Google Ads account ${fmtId(made.customerId)} is ready for you`}
        description={
          <ol className="m-0 pl-4 text-sm">
            <li>Open the invitation Google emailed to <b>{made.email}</b> and accept it.</li>
            <li>In Google Ads ▸ Billing, add a payment method — Google charges your ad spend there, never Oyklane.</li>
            <li>Come back and click Refresh, then choose the account.</li>
          </ol>
        }
        action={<Button size="small" onClick={onDone}>Refresh</Button>}
      />
    );
  }
  return (
    <Card size="small" title="No Google Ads account? Create one here">
      <p className="text-sm text-ink-muted mt-0">Oyklane makes the account and invites you as its admin — it&apos;s yours, billed by Google to your own payment method.</p>
      <Form
        layout="vertical"
        requiredMark={false}
        initialValues={{ name: storeName, email: google?.email || "" }}
        onFinish={async (values) => {
          setBusy(true);
          try {
            setMade(await apiFetch("/api/google-ads/accounts/create", { method: "POST", body: values }));
            message.success("Account created — check your email for Google's invitation");
          } catch (err) {
            message.error(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid sm:grid-cols-2 gap-x-3">
          <Form.Item name="name" label="Account name" rules={[{ required: true, min: 2, message: "Enter a name" }]}>
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item name="email" label="Your email (Google sends the invitation here)" rules={[{ required: true, type: "email", message: "Enter a valid email" }]}>
            <Input />
          </Form.Item>
        </div>
        <Button type="primary" htmlType="submit" loading={busy}>
          Create my Google Ads account
        </Button>
        <p className="text-xs text-ink-muted mt-2 mb-0">Currency and time zone follow your store&apos;s settings — Google doesn&apos;t let you change them later.</p>
      </Form>
    </Card>
  );
}

/** Pick which Google Ads account this store manages. */
function ChooseAccount({ onChosen, status, google, storeName }) {
  const { message } = App.useApp();
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [pick, setPick] = useState(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    setList(null);
    apiFetch("/api/google-ads/accounts")
      .then((d) => setList(d.accounts))
      .catch((err) => setError(err.message));
  }, [n]);
  if (error) return <Alert type="error" showIcon message="Couldn't list your Google Ads accounts" description={error} />;
  if (!list) return <Card><Skeleton active /></Card>;
  const usable = list.filter((a) => !a.error);
  const blocked = list.filter((a) => a.error);
  return (
    <Card title="Choose your Google Ads account" extra={<Button size="small" onClick={() => setN((x) => x + 1)}>Refresh</Button>}>
      {blocked.length > 0 && (
        <Alert
          className="!mb-3"
          type="warning"
          showIcon
          message={blocked.length === 1 ? `Account ${fmtId(blocked[0].customerId)} can't be used yet` : `${blocked.length} accounts can't be used yet`}
          description={
            <ul className="m-0 pl-4 text-sm">
              {blocked.map((a) => (
                <li key={a.customerId}>
                  <b>{fmtId(a.customerId)}</b>: {a.error}
                </li>
              ))}
            </ul>
          }
        />
      )}
      {!usable.length ? (
        <CreateAccount status={status} google={google} storeName={storeName} onDone={() => setN((x) => x + 1)} />
      ) : (
        <div className="flex flex-col gap-3 max-w-md">
          <Select
            placeholder="Google Ads account"
            value={pick?.customerId}
            onChange={(v) => setPick(list.find((a) => a.customerId === v))}
            options={usable.map((a) => ({ value: a.customerId, label: `${a.name} · ${fmtId(a.customerId)}${a.via ? ` · via ${a.via}` : ""}${a.test ? " · TEST" : ""}` }))}
          />
          <Button
            type="primary"
            disabled={!pick}
            onClick={async () => {
              try {
                await apiFetch("/api/google-ads/accounts/select", { method: "POST", body: { customerId: pick.customerId, loginCustomerId: pick.loginCustomerId } });
                onChosen();
              } catch (err) {
                message.error(err.message);
              }
            }}
          >
            Use this account
          </Button>
        </div>
      )}
    </Card>
  );
}

const CATEGORY = { PURCHASE: "Purchase", ADD_TO_CART: "Add to cart", BEGIN_CHECKOUT: "Checkout", PAGE_VIEW: "Page view", SUBMIT_LEAD_FORM: "Lead", QUALIFIED_LEAD: "Lead", CONVERTED_LEAD: "Lead", ENGAGEMENT: "Engagement", DEFAULT: "Other" };
const ORDER = ["Purchase", "Checkout", "Add to cart", "Lead", "Page view", "Engagement", "Other"];

/** Conversion actions grouped by what they count — Google lists every GA4
 * event as its own action, so a flat list reads as noise. */
function Conversions({ list }) {
  const [all, setAll] = useState(false);
  if (!list.length) return <p className="m-0 text-[13px] text-ink-muted">None yet.</p>;
  const groups = new Map();
  for (const c of list) {
    const g = CATEGORY[c.category] || "Other";
    groups.set(g, [...(groups.get(g) || []), c]);
  }
  const rows = ORDER.filter((g) => groups.has(g)).map((g) => [g, groups.get(g)]);
  const shown = all ? rows : rows.slice(0, 3);
  return (
    <div className="flex flex-col gap-2.5">
      {shown.map(([g, items]) => (
        <div key={g}>
          <p className="m-0 mb-1 text-[12px] font-medium text-ink-muted">
            {g} <span className="tabular-nums">· {items.length}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {items.slice(0, all ? 99 : 4).map((c) => (
              <Tag key={c.id} className="m-0 max-w-full truncate" color={c.primary && g === "Purchase" ? "blue" : undefined} title={c.name}>
                {c.name}
              </Tag>
            ))}
            {!all && items.length > 4 && <Tag className="m-0" bordered={false}>+{items.length - 4}</Tag>}
          </div>
        </div>
      ))}
      {(rows.length > 3 || rows.some(([, i]) => i.length > 4)) && (
        <Button type="link" size="small" className="!px-0 self-start" onClick={() => setAll((v) => !v)}>
          {all ? "Show less" : `Show all ${list.length}`}
        </Button>
      )}
    </div>
  );
}

function Setup({ caps, reload, canEdit }) {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  if (!caps) return <Skeleton active />;
  const checks = caps.checks || [];
  const done = checks.filter((c) => c.ok).length;
  const setupTracking = async () => {
    setBusy(true);
    try {
      const r = await apiFetch("/api/google-ads/conversions/setup", { method: "POST" });
      message.success(`Purchase tracking on (${r.tagId}) — your store sends each order to Google`);
      reload();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  };
  const extra = (caps.problems || []).filter((p) => !/payment setup|purchase tracking|purchases aren't sent|Merchant Center isn't linked|Auto-tagging|status is/i.test(p.text));
  return (
    <div className="grid lg:grid-cols-5 gap-4 items-start">
      <Card
        className="lg:col-span-3"
        title="Ready to run ads?"
        extra={<span className="text-[12.5px] text-ink-muted tabular-nums">{done} of {checks.length} done</span>}
      >
        <div className="h-1.5 w-full rounded-full bg-[#EDEFF3] overflow-hidden mb-4" aria-hidden="true">
          <div className="h-full rounded-full bg-[#047857] transition-[width] duration-500" style={{ width: `${checks.length ? (done / checks.length) * 100 : 0}%` }} />
        </div>
        <ul className="list-none p-0 m-0 flex flex-col">
          {checks.map((c) => (
            <li key={c.key} className="flex items-start gap-3 py-3 border-t border-app-border first:border-t-0 first:pt-0">
              {c.ok ? (
                <CheckCircle2 size={18} className="text-status-success shrink-0 mt-[1px]" aria-label="Done" />
              ) : c.ok === null ? (
                <HelpCircle size={18} className="text-ink-subtle shrink-0 mt-[1px]" aria-label="Couldn't check" />
              ) : (
                <AlertTriangle size={18} className="text-status-warning shrink-0 mt-[1px]" aria-label="To do" />
              )}
              <div className="min-w-0 flex-1">
                <p className={`m-0 text-[14px] ${c.ok ? "text-ink" : "text-ink font-medium"}`}>{c.label}</p>
                {!c.ok && <p className="m-0 mt-0.5 text-[12.5px] text-ink-muted">{c.ok === null ? "Google didn't say — check in Google Ads." : c.fix}</p>}
              </div>
              {!c.ok && c.action === "setup_conversions" && canEdit && (
                <Button size="small" type="primary" loading={busy} onClick={setupTracking} className="shrink-0">
                  Set up
                </Button>
              )}
            </li>
          ))}
        </ul>
        {extra.length > 0 && (
          <ul className="list-none p-0 m-0 mt-3 flex flex-col gap-2">
            {extra.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]">
                <AlertTriangle size={15} className="text-status-warning shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {p.text}
                  {p.fix && <span className="block text-[12px] text-ink-muted">{p.fix}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="lg:col-span-2 flex flex-col gap-4">
        <Card size="small" title="Account">
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            <dt className="text-ink-muted">ID</dt>
            <dd className="m-0 tabular-nums">{fmtId(caps.account.id)}{caps.account.test ? " (test)" : ""}</dd>
            <dt className="text-ink-muted">Currency</dt>
            <dd className="m-0">{caps.account.currency}</dd>
            <dt className="text-ink-muted">Time zone</dt>
            <dd className="m-0">{caps.account.timeZone}</dd>
            <dt className="text-ink-muted">Merchant Center</dt>
            <dd className="m-0 tabular-nums">{caps.merchants.length ? caps.merchants.join(", ") : "Not linked"}</dd>
          </dl>
          <p className="text-[12px] text-ink-muted mt-3 mb-0">Google bills your ad spend to this account&apos;s payment method — never through Oyklane.</p>
        </Card>
        <Card size="small" title={`Conversions Google counts (${caps.conversions.length})`}>
          <Conversions list={caps.conversions} />
        </Card>
      </div>
    </div>
  );
}

/** The connected account at a glance: name, ID, what's on — and the way
 * to Google Ads itself. */
function AccountBar({ account, onChange }) {
  const id = fmtId(account.customerId);
  const named = account.name && account.name.replace(/\D/g, "") !== account.customerId;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[12px] border border-app-border bg-white px-4 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#EEF3FD]" aria-hidden="true">
        <Megaphone size={18} className="text-[#3D6BD6]" />
      </span>
      <div className="min-w-0 mr-auto">
        <p className="m-0 text-[15px] font-semibold text-ink truncate">{named ? account.name : "Google Ads account"}</p>
        <p className="m-0 text-[12.5px] text-ink-muted tabular-nums">
          {id}
          {account.currency ? ` · ${account.currency}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {account.purchaseTracking ? (
          <Tag className="m-0" color="green" icon={<CheckCircle2 size={12} className="mr-1 -mt-px inline" aria-hidden="true" />}>Purchase tracking on</Tag>
        ) : (
          <Tag className="m-0" color="gold">Purchase tracking off</Tag>
        )}
        {account.merchantId ? <Tag className="m-0">Merchant Center {account.merchantId}</Tag> : <Tag className="m-0" color="default">No Merchant Center</Tag>}
      </div>
      <div className="flex items-center gap-1">
        <a href="https://ads.google.com/aw/overview" target="_blank" rel="noopener noreferrer">
          <Button size="small" icon={<ExternalLink size={13} aria-hidden="true" />}>Google Ads</Button>
        </a>
        <Popconfirm title="Use a different Google Ads account?" onConfirm={onChange}>
          <Button size="small" type="text">Change</Button>
        </Popconfirm>
      </div>
    </div>
  );
}

function Drafts({ onOpen, refreshKey }) {
  const [drafts, setDrafts] = useState([]);
  const load = useCallback(() => apiFetch("/api/google-ads/drafts").then((d) => setDrafts(d.drafts)).catch(() => {}), []);
  useEffect(() => {
    load();
  }, [load, refreshKey]);
  if (!drafts.length) return null;
  return (
    <Card size="small" title={<span className="flex items-center gap-1.5"><FileClock size={14} aria-hidden="true" /> Unfinished campaigns</span>}>
      {drafts.map((d) => (
        <div key={d.id} className="flex items-center justify-between gap-2 text-sm py-0.5">
          <span className="truncate">{d.name} {d.status === "failed" && <Tag color="red">Not created</Tag>}{d.error && <span className="block text-xs text-status-danger">{d.error}</span>}</span>
          <span className="flex gap-1 shrink-0">
            <Button size="small" onClick={() => onOpen(d.id)}>Continue</Button>
            <Popconfirm title="Delete this draft?" onConfirm={() => apiFetch(`/api/google-ads/drafts/${d.id}`, { method: "DELETE" }).then(load)}>
              <Button size="small" type="text" danger>Delete</Button>
            </Popconfirm>
          </span>
        </div>
      ))}
    </Card>
  );
}

function Suite({ storeInfo }) {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState(TABS.includes(params.get("tab")) ? params.get("tab") : "campaigns");
  const [range, setRange] = useState({ preset: "last_7d" });
  const [caps, setCaps] = useState(null);
  const [capsError, setCapsError] = useState(null);
  const [wizard, setWizard] = useState({ open: false });
  const [refreshKey, setRefreshKey] = useState(0);
  const canEdit = storeInfo.role !== "staff";
  const loadCaps = useCallback(() => apiFetch("/api/google-ads/capabilities").then(setCaps).catch((err) => setCapsError(err.message)), []);
  useEffect(() => {
    loadCaps();
  }, [loadCaps]);
  const label = (Icon, text) => (
    <span className="inline-flex items-center gap-1.5">
      <Icon size={14} aria-hidden="true" />
      {text}
    </span>
  );
  return (
    <div className="flex flex-col gap-3">
      {capsError && <Alert type="error" showIcon message="Couldn't read your Google Ads account" description={capsError} />}
      {caps?.problems?.length > 0 && tab !== "setup" && <Alert type="warning" showIcon message={`${caps.problems.length} thing${caps.problems.length === 1 ? "" : "s"} to fix in your Google Ads account`} action={<Button size="small" onClick={() => setTab("setup")}>See</Button>} />}
      <Tabs
        activeKey={tab}
        onChange={(k) => {
          setTab(k);
          router.replace(`/admin/apps/google-ads?tab=${k}`, { scroll: false });
        }}
        destroyOnHidden
        items={[
          { key: "campaigns", label: label(Megaphone, "Campaigns"), children: <div className="flex flex-col gap-3"><Drafts refreshKey={refreshKey} onOpen={(id) => setWizard({ open: true, draftId: id })} /><GCampaigns key={refreshKey} canEdit={canEdit} range={range} setRange={setRange} onCreate={() => setWizard({ open: true })} /></div> },
          { key: "insights", label: label(LineChart, "Insights"), children: <GInsights range={range} setRange={setRange} canEdit={canEdit} /> },
          { key: "media", label: label(Images, "Images"), children: <GMedia /> },
          { key: "automation", label: label(Bot, "Automation & activity"), children: <Automation canEdit={canEdit} base="/api/google-ads" unit="campaigns" /> },
          { key: "setup", label: label(ShieldCheck, "Account check"), children: <Setup caps={caps} reload={loadCaps} canEdit={canEdit} /> },
        ]}
      />
      {caps && (
        <GWizard
          open={wizard.open}
          draftId={wizard.draftId}
          caps={caps}
          storeUrl={storeInfo.store?.publicUrl}
          storeName={storeInfo.store?.name}
          onClose={() => {
            setWizard({ open: false });
            setRefreshKey((k) => k + 1);
          }}
          onPublished={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}

export default function GoogleAdsPage() {
  const { message } = App.useApp();
  const [accounts, setAccounts] = useState(null);
  const [status, setStatus] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);
  const load = useCallback(async () => {
    try {
      const [a, s, st] = await Promise.all([apiFetch("/api/accounts"), apiFetch("/api/google-ads/status"), apiFetch("/api/store")]);
      setAccounts(a);
      setStatus(s);
      setStoreInfo(st);
    } catch (err) {
      message.error(err.message);
    }
  }, [message]);
  useEffect(() => {
    load();
  }, [load]);

  const google = accounts?.google;
  const ready = google?.connected && google.access?.ads !== false;
  return (
    <div>
      <PageHeader
        title="Google Ads"
        actions={
          <>
            <Link href="/admin/apps/meta-ads"><Button>Meta Ads</Button></Link>
            <Link href="/admin/apps/google-shopping"><Button>Merchant Center</Button></Link>
          </>
        }
      />
      {!accounts || !status || !storeInfo ? (
        <Skeleton active />
      ) : !status.configured ? (
        <Alert type="info" showIcon message="Google Ads is being set up on Oyklane" description="It'll be available here as soon as Oyklane's Google Ads access is approved — nothing for you to do." />
      ) : !ready ? (
        <AccountSignIn kind="google" account={google} access="ads" title="Sign in with Google" description="Use the Google account that has your Google Ads account. Oyklane manages campaigns and reads results — you can remove access any time." returnTo="/admin/apps/google-ads" />
      ) : !status.account ? (
        <div className="flex flex-col gap-3">
          <AccountLine kind="google" account={google} />
          <ChooseAccount onChosen={load} status={status} google={google} storeName={storeInfo.store?.name} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <AccountBar account={status.account} onChange={() => apiFetch("/api/google-ads/account", { method: "DELETE" }).then(load)} />
          <Suspense fallback={null}>
            <Suite storeInfo={storeInfo} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
