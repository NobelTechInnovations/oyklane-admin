"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Card, Input, Progress, Skeleton, Switch, Tag, Upload } from "antd";
import { Check, Mail, Phone, FileCheck2, FileUp, RefreshCw, X } from "lucide-react";
import { TrustSeal, VerifiedTick } from "@shopcycle/ui";
import { apiFetch, apiUpload } from "@/lib/api";
import { SettingsSectionHeader } from "../SettingsNav";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
const barColor = (s) => (s >= 75 ? "#16a34a" : s >= 50 ? "#d97706" : "#dc2626");

/** Settings ▸ Trust & badge: the seller's badge, why, and the steps to
 * become a verified seller. Nothing here changes the badge itself. */
export function TrustSettings() {
  const { message } = App.useApp();
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    apiFetch("/api/trust")
      .then(setD)
      .catch((err) => message.error(err.message));
  }, [message]);

  async function run(key, fn, ok) {
    setBusy(key);
    try {
      const r = await fn();
      if (r?.tier) setD(r);
      if (ok) message.success(typeof ok === "function" ? ok(r) : ok);
      return r;
    } catch (err) {
      message.error(err.message);
      return null;
    } finally {
      setBusy(null);
    }
  }

  if (!d) return <Skeleton active paragraph={{ rows: 8 }} />;
  const v = d.verification;

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <SettingsSectionHeader
        title="Trust & badge"
        description="Buyers see your badge under your store's footer. Oyklane works it out every day from your last 90 days. It can't be edited or bought, so keep your score up to earn the next one."
        actions={
          <Button icon={<RefreshCw size={14} aria-hidden="true" />} loading={busy === "refresh"} onClick={() => run("refresh", () => apiFetch("/api/trust/refresh", { method: "POST" }), "Score updated")}>
            Update now
          </Button>
        }
      />

      {d.held && <Alert type="warning" showIcon message="Your badge is hidden from buyers while Oyklane looks into reports about your store." description="Contact Oyklane support to resolve it." />}

      <Card size="small" styles={{ body: { padding: 24 } }}>
        <div className="flex flex-wrap items-center gap-5">
          <TrustSeal tier={d.tier.key} size={84} />
          <div className="min-w-[220px] flex-1">
            <p className="m-0 text-[13px] text-ink-muted">Your badge</p>
            <h3 className="m-0 text-[22px] font-semibold text-ink">{d.tier.label}</h3>
            <p className="m-0 mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
              {v.verified ? (
                <span className="inline-flex items-center gap-1 font-medium text-[#1e3a8a]">
                  <VerifiedTick /> Verified seller
                </span>
              ) : (
                <span>Not verified yet</span>
              )}
              <span>· since {fmtDate(d.tierSince)}</span>
              <span>· updated {fmtDate(d.computedAt)}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="m-0 text-[13px] text-ink-muted">Score</p>
            <p className="m-0 text-[30px] font-semibold tabular-nums text-ink">
              {d.score}
              <span className="text-[15px] font-normal text-ink-muted">/100</span>
            </p>
          </div>
        </div>

        {d.next ? (
          <div className="mt-5 rounded-xl bg-app-bg p-4">
            <p className="m-0 mb-3 flex items-center gap-2 text-[13.5px] font-medium text-ink">
              <TrustSeal tier={d.next.key} size={22} /> To reach {d.next.label}
            </p>
            <ul className="m-0 grid list-none gap-2 p-0 text-[13px] sm:grid-cols-2">
              <Need ok={!d.next.needScore} text={`Score ${d.next.min}+`} have={`${d.score} now`} />
              <Need ok={!d.next.needOrders} text={`${d.next.orders.toLocaleString("en-IN")} completed orders`} have={`${d.lifetimeOrders.toLocaleString("en-IN")} so far`} />
              <Need ok={!d.next.needDays} text={`${d.next.days} days on Oyklane`} have={`${d.ageDays} days`} />
              {d.next.verified && <Need ok={!d.next.needVerified} text="Verified seller" have={d.next.needVerified ? "finish the steps below" : "done"} />}
            </ul>
          </div>
        ) : (
          <p className="mb-0 mt-4 text-[13px] text-ink-muted">You hold the highest badge. Keep your score at 87 or more to keep it.</p>
        )}
      </Card>

      <Card size="small" title="Where buyers see your badge" styles={{ body: { padding: 20 } }}>
        <p className="mt-0 text-[13px] text-ink-muted">Buyers see only your badge and “Verified”, never your score. It's small and quiet so it doesn't distract from your products.</p>
        <div className="flex flex-col gap-3">
          <ShowRow title="Under your store's footer" note="Always on, on every page." checked disabled />
          <ShowRow
            title="Product pages"
            note="Under the Add to cart button."
            checked={d.display.showOnProduct}
            loading={busy === "showOnProduct"}
            onChange={(v) => run("showOnProduct", () => apiFetch("/api/trust/display", { method: "PATCH", body: { showOnProduct: v } }), v ? "Shown on product pages" : "Hidden on product pages")}
          />
          <ShowRow
            title="Checkout pop-up"
            note="Under “Payments are encrypted and secure”."
            checked={d.display.showInCheckout}
            loading={busy === "showInCheckout"}
            onChange={(v) => run("showInCheckout", () => apiFetch("/api/trust/display", { method: "PATCH", body: { showInCheckout: v } }), v ? "Shown in checkout" : "Hidden in checkout")}
          />
        </div>
        <p className="mb-0 mt-3 text-[12px] text-ink-muted">Changes show on your store within 10 minutes.</p>
      </Card>

      <Card size="small" title="How your score is made" styles={{ body: { padding: 20 } }}>
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {d.parts.map((p) => (
            <li key={p.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13.5px] font-medium text-ink">
                  {p.label} <span className="font-normal text-ink-muted">· up to {p.weight} points</span>
                </span>
                <span className="tabular-nums text-[13px] text-ink">{Math.round((p.score * p.weight) / 100)}</span>
              </div>
              <Progress percent={p.score} showInfo={false} size="small" strokeColor={barColor(p.score)} className="!mb-0" />
              <p className="m-0 text-[12.5px] text-ink-muted">{[p.value, p.note].filter(Boolean).join(" · ")}</p>
              {p.score < 75 && <p className="m-0 text-[12.5px] text-ink">Tip: {p.tip}</p>}
            </li>
          ))}
          {d.penalty > 0 && (
            <li className="text-[13px] text-[#b91c1c]">
              −{d.penalty} points: buyer reports Oyklane upheld in the last 6 months.
            </li>
          )}
        </ul>
      </Card>

      <Card size="small" title="Become a verified seller" styles={{ body: { padding: 20 } }}>
        <p className="mt-0 text-[13px] text-ink-muted">
          Verified sellers show a blue tick next to their badge, so buyers know a real, registered business is behind the store. Trusted Seller and higher badges need it.
        </p>
        <div className="flex flex-col divide-y divide-app-border">
          <Step icon={Mail} title="Owner's email" done={v.email}>
            {v.email ? (
              <span className="text-[13px] text-ink-muted">Confirmed.</span>
            ) : (
              <Button size="small" loading={busy === "email"} onClick={() => run("email", () => apiFetch("/api/auth/email/resend", { method: "POST" }), "Check the owner's inbox for the link")}>
                Send confirmation email
              </Button>
            )}
          </Step>
          <Step icon={Phone} title="Store phone number" done={v.phoneVerified}>
            <PhoneStep v={v} busy={busy} run={run} />
          </Step>
          <Step icon={FileCheck2} title="GST registration" done={v.gstStatus === "verified"}>
            <GstStep v={v} busy={busy} run={run} />
          </Step>
        </div>
      </Card>

      <Card size="small" title="Badges" styles={{ body: { padding: 20 } }}>
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
          {d.tiers.map((t) => (
            <li key={t.key} className={`flex items-center gap-3 rounded-xl border p-3 ${t.key === d.tier.key ? "border-ink bg-app-bg" : "border-app-border"}`}>
              <TrustSeal tier={t.key} size={38} />
              <div className="min-w-0">
                <p className="m-0 text-[13.5px] font-semibold text-ink">{t.label}</p>
                <p className="m-0 text-[11.5px] leading-snug text-ink-muted">
                  {t.min ? `Score ${t.min}+ · ${t.orders.toLocaleString("en-IN")} orders · ${t.days} days${t.verified ? " · verified" : ""}` : "Every new store"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function ShowRow({ title, note, checked, disabled, loading, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span>
        <span className="block text-[13.5px] font-medium text-ink">{title}</span>
        <span className="block text-[12.5px] text-ink-muted">{note}</span>
      </span>
      <Switch checked={checked} disabled={disabled} loading={loading} onChange={onChange} />
    </label>
  );
}

function Need({ ok, text, have }) {
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full ${ok ? "bg-[#16a34a] text-white" : "border border-app-border"}`}>{ok && <Check size={11} aria-hidden="true" />}</span>
      <span>
        <span className="text-ink">{text}</span> <span className="text-ink-muted">({have})</span>
      </span>
    </li>
  );
}

function Step({ icon: Icon, title, done, children }) {
  return (
    <div className="flex flex-wrap items-start gap-3 py-4 first:pt-0 last:pb-0">
      <span className={`grid h-8 w-8 flex-none place-items-center rounded-full ${done ? "bg-[#dcfce7] text-[#166534]" : "bg-app-bg text-ink-muted"}`}>{done ? <Check size={16} aria-hidden="true" /> : <Icon size={15} aria-hidden="true" />}</span>
      <div className="min-w-0 flex-1">
        <p className="m-0 mb-1.5 text-[13.5px] font-medium text-ink">{title}</p>
        {children}
      </div>
    </div>
  );
}

function PhoneStep({ v, busy, run }) {
  const [phone, setPhone] = useState(v.phone || "");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [changing, setChanging] = useState(false);
  if (v.phoneVerified && !changing) {
    return (
      <span className="text-[13px] text-ink-muted">
        {v.phone} confirmed.{" "}
        <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-[13px] text-ink underline" onClick={() => (setChanging(true), setPhone(""))}>
          Change
        </button>
      </span>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input className="!w-[190px]" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" inputMode="tel" aria-label="Phone number" />
      <Button loading={busy === "phone-send"} disabled={!phone} onClick={async () => (await run("phone-send", () => apiFetch("/api/trust/phone/send", { method: "POST", body: { phone } }), (r) => (r?.channel === "sms" ? "Code sent by SMS" : r?.channel === "whatsapp" ? "Code sent on WhatsApp" : "Code sent on WhatsApp and SMS"))) && setSent(true)}>
        {sent ? "Send again" : "Send code"}
      </Button>
      {sent && (
        <>
          <Input className="!w-[120px]" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" inputMode="numeric" maxLength={6} aria-label="Code" />
          <Button type="primary" loading={busy === "phone-verify"} disabled={code.length !== 6} onClick={async () => (await run("phone-verify", () => apiFetch("/api/trust/phone/verify", { method: "POST", body: { code } }), "Phone number confirmed")) && (setSent(false), setChanging(false))}>
            Confirm
          </Button>
        </>
      )}
    </div>
  );
}

function GstStep({ v, busy, run }) {
  const [edit, setEdit] = useState(v.gstStatus === "none" || v.gstStatus === "rejected");
  const [f, setF] = useState({ gstin: v.gstin || "", legalName: v.legalName || "", docUrl: v.gstDocUrl || "" });
  if (!edit) {
    return (
      <div className="text-[13px]">
        <p className="m-0 text-ink">
          {v.gstin} · {v.legalName}{" "}
          {v.gstStatus === "verified" ? <Tag color="green">Verified</Tag> : <Tag color="gold">Oyklane is checking</Tag>}
        </p>
        {v.gstStatus === "pending" && <p className="m-0 text-ink-muted">Usually done within 1–2 working days.</p>}
        <button type="button" className="mt-1 cursor-pointer border-0 bg-transparent p-0 text-[13px] text-ink underline" onClick={() => setEdit(true)}>
          {v.gstStatus === "verified" ? "Change GSTIN" : "Edit details"}
        </button>
      </div>
    );
  }
  return (
    <div className="flex max-w-md flex-col gap-2">
      {v.gstStatus === "rejected" && <Alert type="error" showIcon icon={<X size={14} />} message="Oyklane couldn't verify your GST details" description={v.gstNote} />}
      <Input value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} placeholder="GSTIN, e.g. 27AAPFU0939F1ZV" maxLength={15} spellCheck={false} aria-label="GSTIN" />
      <Input value={f.legalName} onChange={(e) => setF({ ...f, legalName: e.target.value })} placeholder="Legal name on the certificate" aria-label="Legal name" />
      <p className="m-0 text-[12px] text-ink-muted">Own more than one store? Use the same GSTIN — once Oyklane checks it on one store, your other stores are verified straight away, without uploading the file again.</p>
      <GstFile value={f.docUrl} onChange={(docUrl) => setF((x) => ({ ...x, docUrl }))} />
      <div className="flex gap-2">
        <Button type="primary" loading={busy === "gst"} disabled={f.gstin.length !== 15 || !f.legalName} onClick={async () => (await run("gst", () => apiFetch("/api/trust/gst", { method: "POST", body: f }), (r) => (r?.verification?.gstStatus === "verified" ? "GST verified" : "Sent to Oyklane for checking"))) && setEdit(false)}>
          Send for checking
        </Button>
        {v.gstStatus !== "none" && v.gstStatus !== "rejected" && <Button onClick={() => setEdit(false)}>Cancel</Button>}
      </div>
    </div>
  );
}

/** The GST certificate: a PDF or a photo, kept private (only Oyklane can
 * open it — it doesn't go in the store's media library). */
function GstFile({ value, onChange }) {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(value ? "Certificate uploaded" : "");
  return (
    <Upload.Dragger
      accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
      multiple={false}
      showUploadList={false}
      disabled={busy}
      customRequest={async ({ file, onSuccess, onError }) => {
        setBusy(true);
        try {
          const r = await apiUpload("/api/trust/gst/doc", file);
          setName(r.name);
          onChange(r.docUrl);
          onSuccess(r);
        } catch (err) {
          message.error(err.message);
          onError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="m-0 flex justify-center text-ink-muted">{name ? <FileCheck2 size={22} /> : <FileUp size={22} />}</p>
      <p className="m-0 mt-2 text-[14px] text-ink">{busy ? "Uploading…" : name || "Drop your GST certificate here, or click to upload"}</p>
      <p className="m-0 mt-1 text-[12px] text-ink-muted">{name ? "Click or drop another file to replace it." : "PDF, or a clear photo (JPG, PNG, WebP) of your GST registration certificate (REG-06). Up to 5MB. Only Oyklane sees it."}</p>
    </Upload.Dragger>
  );
}
