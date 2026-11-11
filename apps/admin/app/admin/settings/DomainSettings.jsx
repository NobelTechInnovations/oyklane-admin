"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Input, Button, App, Alert, Skeleton, Switch } from "antd";
import { Globe, Copy, ExternalLink, CheckCircle2, Clock, RefreshCw, Trash2 } from "lucide-react";
import { StatusBadge, useConfirmDialog } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";

function CopyButton({ value }) {
  const { message } = App.useApp();
  return (
    <Button
      size="small"
      type="text"
      icon={<Copy size={13} aria-hidden="true" />}
      aria-label={`Copy ${value}`}
      onClick={() =>
        navigator.clipboard.writeText(value).then(
          () => message.success("Copied"),
          () => message.info("Select the text and copy it")
        )
      }
    />
  );
}

const hrefFor = (address) => (address.startsWith("http") ? address : `https://${address}`);

/** "Hang on, it's happening": the steps to a live domain, the current one
 * moving, re-checked every 20 seconds by the page. */
function GoingLive({ stage }) {
  const steps = [
    { key: "added", label: "Domain added to your store", done: true },
    { key: "dns", label: stage === "checking" ? "Checking your DNS records" : "DNS records found", done: stage !== "checking", active: stage === "checking" },
    { key: "ssl", label: "Issuing the security certificate (HTTPS)", done: false, active: stage === "hosting" },
    { key: "live", label: "Your store opens on your domain", done: false },
  ];
  return (
    <div className="rounded-xl border border-[#CFE0F5] bg-[#F4F8FD] px-4 py-4">
      <p className="m-0 text-[14px] font-medium text-ink">Setting up your domain — you can relax, this page updates by itself.</p>
      <p className="m-0 mt-1 text-[12.5px] text-ink-muted">Usually a few minutes. Your free address keeps working meanwhile.</p>
      <ol className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
        {steps.map((st) => (
          <li key={st.key} className="flex items-center gap-2.5 text-[13px]">
            {st.done ? (
              <CheckCircle2 size={18} className="shrink-0 text-[#16A34A]" aria-hidden="true" />
            ) : st.active ? (
              <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center" aria-hidden="true">
                <span className="absolute inset-0 animate-ping rounded-full bg-[#0078d4] opacity-25" />
                <RefreshCw size={14} className="animate-spin text-[#0078d4]" />
              </span>
            ) : (
              <span className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-app-border" aria-hidden="true" />
            )}
            <span className={st.done || st.active ? "text-ink" : "text-ink-muted"}>
              {st.label}
              {st.active && <span className="sr-only"> — in progress</span>}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#DCE8F7]" aria-hidden="true">
        <div className="h-full w-1/3 animate-[oyslide_1.6s_ease-in-out_infinite] rounded-full bg-[#0078d4]" />
      </div>
      <style>{`@keyframes oyslide{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}@media (prefers-reduced-motion: reduce){.animate-spin,.animate-ping{animation:none}}`}</style>
    </div>
  );
}

/** The three things that make a domain work, each ticked off as it's done. */
function Checklist({ info }) {
  const records = [...(info.records || []), ...(info.hosting?.verification || [])];
  const dnsOk = records.length > 0 && records.every((r) => r.ok);
  const rows = [
    { ok: dnsOk, title: dnsOk ? "DNS records found" : "DNS records not detected yet", text: dnsOk ? "Your domain points to Oyklane." : "Add the records below at your domain provider — usually live within an hour." },
    { ok: info.live, title: info.live ? "Domain is live" : "Domain is not live yet", text: info.live ? `Shoppers reach your store at ${info.domain}.` : "It goes live as soon as the records are found and the certificate is ready." },
    { ok: info.live, pending: dnsOk && !info.live, title: info.live ? "Secure connection (HTTPS) ready" : dnsOk ? "Issuing the security certificate…" : "Security certificate (HTTPS)", text: info.live ? "Free certificate, renewed by itself." : "Starts once your DNS records are found." },
  ];
  return (
    <ul className="m-0 p-0 list-none flex flex-col">
      {rows.map((r) => (
        <li key={r.title} className="flex items-start gap-3 py-3 border-t border-app-border first:border-t-0">
          <span className={`mt-0.5 w-5 h-5 rounded-full grid place-items-center shrink-0 ${r.ok ? "bg-[#DCFCE7] text-[#15803D]" : r.pending ? "bg-[#FEF3C7] text-[#B45309]" : "bg-[#FEE2E2] text-[#B91C1C]"}`} aria-hidden="true">
            {r.ok ? <CheckCircle2 size={14} /> : <Clock size={13} />}
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-medium text-ink">{r.title}</span>
            <span className="block text-[12.5px] text-ink-muted">{r.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DomainSettings({ canEdit = true }) {
  const { message } = App.useApp();
  const { confirmDialog } = useConfirmDialog();
  const [info, setInfo] = useState(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(null);
  const [editingHandle, setEditingHandle] = useState(false);
  const [handleValue, setHandleValue] = useState("");

  async function saveHandle() {
    setBusy("handle");
    try {
      const next = await apiFetch("/api/store/domain/handle", { method: "PATCH", body: { handle: handleValue } });
      setInfo(next);
      setEditingHandle(false);
      message.success("Store address changed");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function setRedirect(redirect) {
    setBusy("redirect");
    try {
      setInfo(await apiFetch("/api/store/domain/redirect", { method: "PATCH", body: { redirect } }));
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  const load = useCallback(async (quiet) => {
    if (!quiet) setBusy("check");
    try {
      setInfo(await apiFetch("/api/store/domain"));
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }, [message]);

  useEffect(() => {
    load(true);
  }, [load]);
  // Not live yet: check again by itself every 20 seconds, so the seller can
  // just wait — the page turns live on its own.
  const waiting = Boolean(info?.domain && !info.live);
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => load(true), 20000);
    return () => clearInterval(t);
  }, [waiting, load]);

  async function connect() {
    setBusy("connect");
    try {
      const next = await apiFetch("/api/store/domain", { method: "PUT", body: { domain: value } });
      setInfo(next);
      setValue("");
      message.success(`${next.domain} added — now update its DNS`);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  function disconnect() {
    confirmDialog({
      title: `Disconnect ${info.domain}?`,
      description: `Visitors to ${info.domain} will stop seeing your store. Your free address ${info.defaultAddress} keeps working.`,
      okText: "Disconnect",
      danger: true,
      onConfirm: async () => {
        setInfo(await apiFetch("/api/store/domain", { method: "DELETE" }));
        message.success("Domain disconnected");
      },
    });
  }

  if (!info) {
    return (
      <Card size="small" className="max-w-[880px] w-full mx-auto">
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    );
  }

  return (
    <div className="max-w-[880px] w-full mx-auto flex flex-col gap-4">
      <Card size="small" title="Free Oyklane address">
        {!info.defaultAddress ? (
          <Alert type="warning" showIcon message="Store addresses aren't set up on this platform yet" description="The platform's root domain (STOREFRONT_ROOT_DOMAIN) isn't configured." />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
                  <Globe size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-sm font-medium text-ink truncate">{info.defaultAddress.replace(/^https?:\/\//, "")}</p>
                  <p className="m-0 text-xs text-ink-muted">
                    {info.live && info.redirect ? `Forwards to ${info.domain}` : "Your store's public address. Always works."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <CopyButton value={hrefFor(info.defaultAddress)} />
                <Button size="small" href={hrefFor(info.defaultAddress)} target="_blank" rel="noopener noreferrer" icon={<ExternalLink size={13} aria-hidden="true" />}>
                  Open
                </Button>
                {canEdit && info.rootDomain !== "localhost" && !editingHandle && (
                  <Button size="small" type="text" onClick={() => (setHandleValue(info.handle), setEditingHandle(true))}>
                    Change
                  </Button>
                )}
              </div>
            </div>
            {editingHandle && (
              <div className="flex flex-col gap-2 rounded-lg bg-app-bg p-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={handleValue}
                    onChange={(e) => setHandleValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    suffix={<span className="text-ink-muted">.{info.rootDomain}</span>}
                    maxLength={40}
                    aria-label="Store address"
                  />
                  <div className="flex gap-2">
                    <Button type="primary" loading={busy === "handle"} disabled={!handleValue || handleValue === info.handle} onClick={saveHandle}>
                      Save
                    </Button>
                    <Button onClick={() => setEditingHandle(false)}>Cancel</Button>
                  </div>
                </div>
                <p className="m-0 text-xs text-ink-muted">
                  The old address stops working straight away — update links you've shared. Your products, orders and customers don't change.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card
        size="small"
        title="Your own domain"
        extra={
          info.domain ? (
            <StatusBadge
              status={info.live ? "active" : "pending"}
              label={
                info.live
                  ? "Live"
                  : info.stage === "dns"
                    ? "Waiting for DNS"
                    : info.hosting.verification?.length
                      ? "Needs one more record"
                      : info.hosting.notAdded
                        ? "Waiting for activation"
                        : info.stage === "checking"
                          ? "Checking DNS"
                          : "Activating HTTPS"
              }
            />
          ) : null
        }
      >
        {!info.domain ? (
          <>
            <p className="text-sm text-ink-muted mt-0">
              Use a domain you've bought (from GoDaddy, Hostinger, Namecheap…). Enter it here, then add the DNS records we show you at your domain provider.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                size="large"
                placeholder="example.com or shop.example.com"
                value={value}
                disabled={!canEdit}
                onChange={(e) => setValue(e.target.value)}
                onPressEnter={() => value.trim() && connect()}
              />
              <Button size="large" type="primary" loading={busy === "connect"} disabled={!canEdit || !value.trim()} onClick={connect}>
                Connect domain
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-5">
            <div className={`rounded-xl px-4 py-5 flex flex-wrap items-center gap-4 ${info.live ? "bg-gradient-to-br from-[#F0FDF4] to-white" : "bg-gradient-to-br from-[#FFF7ED] to-white"}`}>
              <span className={`w-12 h-12 rounded-full grid place-items-center shrink-0 shadow-sm ${info.live ? "bg-[#16A34A] text-white" : "bg-white text-[#C2410C] ring-1 ring-[#FED7AA]"}`} aria-hidden="true">
                <Globe size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <a href={`https://${info.domain}`} target="_blank" rel="noopener noreferrer" className="block text-[20px] font-semibold text-ink hover:underline truncate">
                  {info.domain}
                </a>
                <span className="block text-[12.5px] text-ink-muted">{info.kind === "apex" ? `Main domain · www.${info.domain} works too` : "Subdomain"}</span>
              </span>
            </div>
            <Checklist info={info} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[13px] font-semibold text-ink">Details</span>
              <div className="flex gap-2">
                <Button size="small" icon={<RefreshCw size={13} aria-hidden="true" />} loading={busy === "check"} onClick={() => load(false)}>
                  Check again
                </Button>
                {canEdit && (
                  <Button size="small" danger icon={<Trash2 size={13} aria-hidden="true" />} onClick={disconnect}>
                    Disconnect
                  </Button>
                )}
              </div>
            </div>

            {info.live ? (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircle2 size={16} />}
                message={`Your store is live at https://${info.domain}`}
                description={info.kind === "apex" ? `www.${info.domain} works too.` : undefined}
              />
            ) : info.stage === "hosting" && info.hosting.verification?.length ? (
              info.hosting.verification.every((v) => v.ok) ? (
                <Alert
                  type="info"
                  showIcon
                  icon={<Clock size={16} />}
                  message="We can see the extra record — almost there"
                  description="The hosting confirms it and issues the security certificate, usually within a few minutes. Press Check again in a little while."
                />
              ) : (
                <Alert
                  type="warning"
                  showIcon
                  message="One more record to prove the domain is yours"
                  description={
                    <>
                      Your domain was used on another site before, so the hosting asks for this extra record. At your domain provider add a new record:
                      type <b>TXT</b>, name <b>{info.hosting.verification[0].name}</b> (just that — most providers, like Hostinger and GoDaddy, add “.{info.domain}” themselves), and the value below
                      (use the copy button; no quotes or spaces). Save, wait a few minutes, then press Check again — the store goes live as soon as it shows.
                    </>
                  }
                />
              )
            ) : info.stage === "hosting" && info.hosting.notAdded ? (
              <Alert
                type="warning"
                showIcon
                message="DNS is right, but the domain isn't switched on at Oyklane yet"
                description={
                  <>
                    Your records are correct — nothing more to do on your side. The domain still has to be added on the platform, which is what issues its
                    security certificate (HTTPS). Your free address keeps working meanwhile.
                    <details className="mt-2 text-xs" open={Boolean(info.hosting.error)}>
                      <summary className="cursor-pointer">For the platform team</summary>
                      {info.hosting.error && (
                        <p className="m-0 my-1 text-[#A11B1B]">
                          Adding it automatically failed: {info.hosting.error}
                        </p>
                      )}
                      Add <code>{info.domain}</code>
                      {info.kind === "apex" ? (
                        <>
                          {" "}and <code>www.{info.domain}</code>
                        </>
                      ) : null}{" "}
                      to the storefront project on Vercel (Settings ▸ Domains) — or set <code>VERCEL_TOKEN</code> and{" "}
                      <code>VERCEL_STOREFRONT_PROJECT_ID</code> on the API so connecting a domain does it automatically.
                    </details>
                  </>
                }
              />
            ) : info.stage === "hosting" || info.stage === "checking" ? (
              <GoingLive stage={info.stage} />
            ) : (
              <Alert
                type="info"
                showIcon
                icon={<Clock size={16} />}
                message="Add these records at your domain provider"
                description="Open your provider's DNS settings, add each record below exactly as shown (delete any old A or CNAME record for the same name), and save. Changes usually show up within an hour, sometimes up to 48 hours."
              />
            )}

            {info.live && (
              <label className="flex items-start justify-between gap-4 rounded-lg border border-app-border px-3 py-3 cursor-pointer">
                <span>
                  <span className="block text-sm font-medium text-ink">Send visitors to {info.domain}</span>
                  <span className="block text-xs text-ink-muted">
                    {info.defaultAddress?.replace(/^https?:\/\//, "")} forwards here, so shoppers and search engines see one address. Turn off to keep both working separately.
                  </span>
                </span>
                <Switch checked={info.redirect} loading={busy === "redirect"} disabled={!canEdit} onChange={setRedirect} />
              </label>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs text-ink-muted">
                    <th className="font-medium py-2 pr-3">Type</th>
                    <th className="font-medium py-2 pr-3">Name / Host</th>
                    <th className="font-medium py-2 pr-3">Value / Points to</th>
                    <th className="font-medium py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...info.records, ...(info.hosting.verification || []).map((v) => ({ ...v, ok: Boolean(v.ok), found: v.found || [] }))].map((r) => (
                    <tr key={`${r.type}-${r.name}-${r.value}`} className="border-t border-app-border align-middle">
                      <td className="py-2.5 pr-3 font-semibold text-ink">{r.type}</td>
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center gap-1 font-mono text-[13px]">
                          {r.name}
                          <CopyButton value={r.name} />
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center gap-1 font-mono text-[13px] break-all">
                          {r.value}
                          <CopyButton value={r.value} />
                        </span>
                      </td>
                      <td className="py-2.5">
                        {r.ok ? <StatusBadge status="active" label="Found" /> : <StatusBadge status="pending" label={r.found?.length ? "Wrong value" : "Not found yet"} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {[...info.records, ...(info.hosting.verification || [])].some((r) => !r.ok && r.found?.length) && (
              <p className="text-xs text-ink-muted m-0 break-all">
                We currently see:{" "}
                {[...info.records, ...(info.hosting.verification || [])]
                  .filter((r) => !r.ok && r.found?.length)
                  .map((r) => `${r.host} → ${r.found.join(", ")}`)
                  .join("; ")}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
