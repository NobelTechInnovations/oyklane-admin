"use client";

import { useEffect, useState } from "react";
import { Card, Switch, Button, Drawer, Input, Alert, App, Tag, Radio } from "antd";
import { Banknote, ExternalLink, ShieldCheck, Trash2 } from "lucide-react";
import { StatusBadge, useConfirmDialog } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/track";

// A small wordmark per gateway, so the list scans like Shopify's.
const MARKS = {
  razorpay: { bg: "#0C2451", fg: "#fff", text: "Razorpay" },
  cashfree: { bg: "#6933D3", fg: "#fff", text: "Cashfree" },
  payu: { bg: "#A6CE39", fg: "#1a1a1a", text: "PayU" },
  stripe: { bg: "#635BFF", fg: "#fff", text: "Stripe" },
  paypal: { bg: "#003087", fg: "#fff", text: "PayPal" },
};

function Mark({ k }) {
  const m = MARKS[k];
  return (
    <span className="inline-flex items-center justify-center h-11 min-w-[96px] px-3 rounded-lg text-[13px] font-bold tracking-tight shrink-0" style={{ background: m.bg, color: m.fg }}>
      {m.text}
    </span>
  );
}

// What each gateway takes, and a line on why a seller would pick it.
const METHODS = {
  payu: ["UPI", "Cards", "RuPay", "Net banking", "Wallets", "EMI", "Pay later"],
  razorpay: ["UPI", "Cards", "RuPay", "Net banking", "Wallets", "EMI", "Pay later"],
  cashfree: ["UPI", "Cards", "Net banking", "Wallets", "EMI", "Pay later"],
  stripe: ["Cards", "Apple Pay", "Google Pay"],
  paypal: ["PayPal", "Cards"],
};
const PERKS = {
  payu: ["0% on UPI payments", "No extra gateway fee from oyklane", "No hidden charges"],
  razorpay: ["Connect your Razorpay account in one click", "Money settles to your bank account"],
  cashfree: ["Use your own Cashfree account", "Money settles to your bank account"],
  stripe: ["For international cards", "Money settles to your Stripe account"],
  paypal: ["For buyers abroad who pay with PayPal"],
};

/** One gateway: what it takes, its state, and its buttons. PayU (Oyklane's
 * partner) shows on top, larger, with its perks. */
function Gateway({ p, featured = false, currency, canEdit, busy, toggle, disconnect, connectPayu, connectRazorpay, edit }) {
  const unsupported = p.currencies && !p.currencies.includes(currency);
  const oauthHere = (p.key === "razorpay" || p.key === "payu") && p.oauth?.available;
  return (
    <div className="flex flex-wrap items-start gap-4">
      <Mark k={p.key} />
      <div className="min-w-[220px] flex-1">
        <p className={`m-0 flex flex-wrap items-center gap-2 font-semibold text-ink ${featured ? "text-[16px]" : "text-[14.5px]"}`}>
          {featured ? "PayU, our payment partner" : p.name}
          {p.key === "payu" && <Tag color="green" className="!m-0">Partner</Tag>}
          {p.connected && <StatusBadge status={p.enabled ? "active" : "disabled"} label={p.enabled ? "On" : "Off"} />}
          {p.connected && p.testMode && <Tag color="gold" className="!m-0">Test mode</Tag>}
          {p.key !== "payu" && p.recommended && !p.connected && <Tag color="blue" className="!m-0">Recommended</Tag>}
        </p>
        {unsupported ? (
          <p className="m-0 mt-1 text-[13px] text-ink-muted">Not available for {currency} stores.</p>
        ) : (
          <>
            {PERKS[p.key] && (
              <ul className={`m-0 mt-2 grid list-none gap-x-4 gap-y-1 p-0 text-[13px] text-ink ${featured ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                {PERKS[p.key].map((t) => (
                  <li key={t} className="flex items-start gap-1.5">
                    <ShieldCheck size={14} className="mt-[3px] shrink-0 text-[#16A34A]" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
            )}
            {METHODS[p.key] && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[12px] text-ink-muted">Takes</span>
                {METHODS[p.key].map((m) => (
                  <span key={m} className="rounded-md border border-app-border bg-app-bg px-1.5 py-0.5 text-[11.5px] text-ink">
                    {m}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
        {p.oauth?.connected ? (
          <div className="mt-2 text-[12.5px] text-ink">
            {p.key === "payu"
              ? p.oauth.ready
                ? `Connected with PayU · merchant ${p.oauth.merchantId}`
                : `PayU account ${p.oauth.merchantId} linked — PayU is finishing its checks; payments turn on by themselves.`
              : `Connected with ${p.name}${p.oauth.accountId ? ` · ${p.oauth.accountId}` : ""}`}
            {p.oauth.statuses?.length > 0 && (
              <span className="mt-1 flex flex-wrap gap-1">
                {p.oauth.statuses.slice(0, 6).map((st) => (
                  <Tag key={st.event} className="!m-0 !text-[11px]" color={/success|approved/i.test(st.status || "") ? "green" : /fail|declin/i.test(st.status || "") ? "red" : "default"}>
                    {String(st.event).replace(/ status update$/i, "").replace(/_/g, " ").toLowerCase()}: {st.status}
                  </Tag>
                ))}
              </span>
            )}
          </div>
        ) : (
          featured && !p.connected && <p className="m-0 mt-2 text-[12.5px] text-ink-muted">Open your PayU account from here — money settles straight into your bank account.</p>
        )}
        {p.key === "razorpay" && p.connected && p.oauth?.available && !p.oauth.connected && (
          <p className="m-0 mt-1.5 text-[12.5px] text-ink">
            Connected with API keys.{" "}
            <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-accent underline" onClick={connectRazorpay} disabled={!canEdit}>
              Switch to Connect with Razorpay
            </button>
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {p.connected ? (
          <>
            <Switch checked={p.enabled} loading={busy === p.key} disabled={!canEdit} onChange={(v) => toggle(p, v)} aria-label={`Accept ${p.name}`} />
            {!p.oauth?.connected && !oauthHere && <Button onClick={() => edit(p)}>Manage</Button>}
            {canEdit && <Button type="text" danger icon={<Trash2 size={14} aria-hidden="true" />} aria-label={`Disconnect ${p.name}`} onClick={() => disconnect(p)} />}
          </>
        ) : p.key === "payu" ? (
          oauthHere ? (
            <Button type="primary" disabled={!canEdit || unsupported} loading={busy === "payu"} onClick={connectPayu}>
              Connect with PayU
            </Button>
          ) : (
            <Button type="primary" disabled={!canEdit || unsupported} onClick={() => edit(p)}>
              Connect with key and salt
            </Button>
          )
        ) : p.key === "razorpay" && oauthHere ? (
          <Button type="primary" disabled={!canEdit || unsupported} loading={busy === "razorpay"} onClick={connectRazorpay}>
            Connect with Razorpay
          </Button>
        ) : (
          <Button type="primary" disabled={!canEdit || unsupported} onClick={() => edit(p)}>
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}

function SetupDrawer({ provider, open, onClose, onSaved, canEdit }) {
  const { message } = App.useApp();
  const [values, setValues] = useState({});
  const [testMode, setTestMode] = useState(provider?.testMode ?? true);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const next = await apiFetch(`/api/payments/${provider.key}`, {
        method: "PUT",
        body: { credentials: values, testMode, enabled: provider.connected ? provider.enabled : true },
      });
      message.success(`${provider.name} ${provider.connected ? "updated" : "connected"}`);
      if (!provider.connected) track("gateway_connected", { gateway: provider.key, test_mode: testMode });
      onSaved(next);
      onClose();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!provider) return null;
  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={460}
      title={
        <span className="flex items-center gap-3">
          <Mark k={provider.key} /> {provider.connected ? "Manage" : "Connect"} {provider.name}
        </span>
      }
      destroyOnHidden
      afterOpenChange={(o) => o && (setValues({}), setTestMode(provider.testMode ?? true))}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} disabled={!canEdit} onClick={save}>
            {provider.connected ? "Save" : "Connect"}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-ink-muted mt-0">{provider.blurb}</p>
      <a href={provider.docs} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-ink hover:underline mb-4">
        Where to find your {provider.name} keys <ExternalLink size={13} aria-hidden="true" />
      </a>

      <label className="flex items-center justify-between gap-3 rounded-lg border border-app-border px-3 py-3 mb-4">
        <span>
          <span className="block text-sm font-medium text-ink">Test mode</span>
          <span className="block text-xs text-ink-muted">Use the gateway's test (sandbox) keys — no real money moves. Checkout shows a "Test mode" tag.</span>
        </span>
        <Switch checked={testMode} onChange={setTestMode} disabled={!canEdit} />
      </label>

      <div className="flex flex-col gap-4">
        {provider.fields.map((f) => (
          <label key={f.key} className="block">
            <span className="block text-[13px] font-medium text-ink mb-1">{f.label}</span>
            {f.secret ? (
              <Input.Password
                autoComplete="off"
                placeholder={f.saved ? `Saved (${f.saved}) — leave empty to keep` : f.placeholder || ""}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                disabled={!canEdit}
              />
            ) : (
              <Input
                autoComplete="off"
                placeholder={f.placeholder || ""}
                value={values[f.key] ?? f.value}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                disabled={!canEdit}
              />
            )}
          </label>
        ))}
      </div>
      {provider.currencies && (
        <p className="text-xs text-ink-muted mt-4 mb-0">Takes payments in {provider.currencies.join(", ")}.</p>
      )}
      <Alert
        className="mt-4"
        type="info"
        showIcon
        icon={<ShieldCheck size={16} />}
        message="Your keys are checked with the gateway, then stored encrypted. They're never shown again or shared."
      />
    </Drawer>
  );
}

export function PaymentSettings({ initial, currency, canEdit }) {
  const { message } = App.useApp();
  const { confirmDialog } = useConfirmDialog();
  const [data, setData] = useState(initial);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(null);

  // Back from PayU's or Razorpay's own page (payu-partner.js / razorpay-oauth.js).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const pu = q.get("payu");
    if (pu) {
      if (pu === "connected") message.success("PayU connected — you can take payments now");
      else if (pu === "pending") message.info("PayU account linked. PayU is finishing its checks — payments turn on by themselves once it's done.");
      else message.error(q.get("message") || "PayU wasn't connected.");
      if (pu !== "error") apiFetch("/api/payments").then(setData).catch(() => {});
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    const r = q.get("razorpay");
    if (!r) return;
    if (r === "connected") {
      message.success("Razorpay connected");
      track("gateway_connected", { gateway: "razorpay", oauth: true });
      apiFetch("/api/payments").then(setData).catch(() => {});
    } else message.error(q.get("message") || "Razorpay wasn't connected.");
    window.history.replaceState(null, "", window.location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** "Connect with PayU": PayU's own page to log in or sign up, then back. */
  async function connectPayu() {
    setBusy("payu");
    try {
      const { url } = await apiFetch("/api/payments/payu/connect");
      window.location.href = url;
    } catch (err) {
      message.error(err.message);
      setBusy(null);
    }
  }

  /** "Connect with Razorpay": off to Razorpay to approve, then back here. */
  async function connectRazorpay() {
    setBusy("razorpay");
    try {
      const { url } = await apiFetch("/api/payments/razorpay/connect");
      window.location.href = url;
    } catch (err) {
      message.error(err.message);
      setBusy(null);
    }
  }

  async function toggle(p, enabled) {
    setBusy(p.key);
    try {
      setData(await apiFetch(`/api/payments/${p.key}`, { method: "PATCH", body: { enabled } }));
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function toggleCod(enabled) {
    setBusy("cod");
    try {
      setData(await apiFetch("/api/payments/cod", { method: "PUT", body: { enabled } }));
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function makePrimary(key) {
    setBusy("primary");
    try {
      setData(await apiFetch("/api/payments/primary", { method: "PUT", body: { provider: key } }));
      message.success("Primary gateway saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  function disconnect(p) {
    confirmDialog({
      title: `Disconnect ${p.name}?`,
      description: "Customers won't see it at checkout, and its saved keys are deleted. Past orders aren't affected.",
      okText: "Disconnect",
      danger: true,
      onConfirm: async () => setData(await apiFetch(`/api/payments/${p.key}`, { method: "DELETE" })),
    });
  }

  const payu = data.providers.find((p) => p.key === "payu");
  const rowProps = { currency, canEdit, busy, toggle, disconnect, connectPayu, connectRazorpay, edit: setEditing };
  const online = data.providers.filter((p) => p.enabled).length;
  const live = data.providers.filter((p) => p.connected && p.enabled);
  const nothing = !data.cod.enabled && online === 0;

  return (
    <div className="max-w-3xl flex flex-col gap-4">
      {nothing && <Alert type="warning" showIcon message="No payment method is on — customers can't place orders." />}

      {payu && (
        <Card size="small" styles={{ body: { padding: 20 } }}>
          <Gateway p={payu} featured {...rowProps} />
        </Card>
      )}

      <Card size="small" title="Other payment gateways" extra={<span className="text-xs text-ink-muted">{online} active in all</span>} styles={{ body: { padding: "4px 20px" } }}>
        <ul className="m-0 list-none divide-y divide-app-border p-0">
          {data.providers
            .filter((p) => p.key !== "payu")
            .map((p) => (
              <li key={p.key} className="py-4">
                <Gateway p={p} {...rowProps} />
              </li>
            ))}
        </ul>
      </Card>

      {live.length >= 2 && (
        <Card size="small" title="Primary gateway">
          <p className="m-0 mb-3 text-[13px] text-ink-muted">
            Checkout uses the primary first. If it can&apos;t start a payment, the order moves to the other gateway automatically — the customer doesn&apos;t see a thing.
          </p>
          <Radio.Group value={data.primary} disabled={!canEdit || busy === "primary"} onChange={(e) => makePrimary(e.target.value)} className="flex flex-col gap-2">
            {live.map((p) => (
              <Radio key={p.key} value={p.key}>
                <span className="text-sm text-ink">{p.name}</span>
                <span className="ml-2 text-xs text-ink-muted">{data.primary === p.key ? "Primary" : "Backup"}</span>
              </Radio>
            ))}
          </Radio.Group>
        </Card>
      )}

      <Card size="small" title="Manual payments">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-md bg-app-bg flex items-center justify-center shrink-0 text-ink">
            <Banknote size={17} aria-hidden="true" />
          </span>
          <div className="flex-1">
            <p className="m-0 text-sm font-medium text-ink">Cash on delivery (COD)</p>
            <p className="m-0 text-xs text-ink-muted">Customers pay by cash or UPI when the order arrives. You mark it paid from the order page.</p>
          </div>
          <Switch checked={data.cod.enabled} loading={busy === "cod"} disabled={!canEdit} onChange={toggleCod} aria-label="Cash on delivery" />
        </div>
      </Card>

      <SetupDrawer provider={editing} open={Boolean(editing)} onClose={() => setEditing(null)} onSaved={setData} canEdit={canEdit} />
    </div>
  );
}
