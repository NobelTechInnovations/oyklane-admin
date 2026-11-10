"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { App, Alert, Button, Card, Form, Input, Select, Skeleton, Space, Switch, Table, Tag, Tooltip } from "antd";
import { Check, X, QrCode, Search, Copy, MessageSquareText } from "lucide-react";
import { formatCurrency } from "@shopcycle/utils";
import { PageHeader, EmptyState, ListCard, SearchInput, useConfirmDialog } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { AppNotInstalled } from "@/components/apps/AppPanelParts";

const STATUS = {
  submitted: { label: "To check", color: "gold" },
  confirmed: { label: "Received", color: "green" },
  rejected: { label: "Not received", color: "red" },
  awaiting: { label: "QR showing", color: "blue" },
  expired: { label: "Not paid", color: "default" },
};

const when = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—");
const inr = (n) => formatCurrency(Number(n || 0), "INR");

function duration(seconds) {
  if (seconds == null) return "—";
  const s = Math.round(seconds);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60 ? `${s % 60} s` : ""}`.trim();
}

/**
 * Apps ▸ UPI QR payments: where shoppers' UPI payments go, the payments
 * to check ("Received" makes the order paid and moves the shopper's QR
 * page on), and the history with its numbers.
 */
export default function UpiQrPage() {
  return (
    <Suspense fallback={<Skeleton active paragraph={{ rows: 8 }} />}>
      <UpiQr />
    </Suspense>
  );
}

function UpiQr() {
  const { message } = App.useApp();
  const { confirmDialog } = useConfirmDialog();
  const params = useSearchParams();
  const [tab, setTab] = useState("submitted");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(null);
  const highlight = params.get("payment");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ status: tab, page: String(page) });
      if (q) qs.set("q", q);
      setData(await apiFetch(`/api/upi-qr?${qs}`));
    } catch (err) {
      if (err.status === 404) setMissing(true);
      else message.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, page, q, message]);

  useEffect(() => {
    load();
  }, [load]);

  const ready = Boolean(data?.settings?.upiId);
  useEffect(() => {
    if (!ready) return;
    apiFetch("/api/upi-qr/preview")
      .then((r) => setPreview(r.svg))
      .catch(() => {});
  }, [ready, data?.settings?.upiId, data?.settings?.payeeName]);

  async function act(row, kind) {
    if (kind === "reject") {
      const ok = await confirmDialog({
        title: `Mark ${inr(row.amount)} as not received?`,
        content: `Order #${row.orderNumber} stays, as cash on delivery. ${row.buyerName || "The customer"} is emailed to pay online from their order page, or to send the UPI reference if they did pay — it then comes back here to check.`,
        okText: "Not received",
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(`${row.id}:${kind}`);
    try {
      await apiFetch(`/api/upi-qr/${row.id}/${kind}`, { method: "POST" });
      message.success(kind === "confirm" ? `Order #${row.orderNumber} is paid` : `Order #${row.orderNumber} is cash on delivery now`);
      load();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  if (missing) return <AppNotInstalled appKey="upi-qr" title="UPI QR payments" description="Take UPI payments straight to your own UPI ID — a QR for the exact amount at checkout, no gateway and no fee." />;
  if (!data) return <Skeleton active paragraph={{ rows: 8 }} />;

  const s = data.stats;
  const counts = data.counts || {};
  const tabs = [
    { key: "submitted", label: "To check", count: counts.submitted || 0 },
    { key: "confirmed", label: "Received", count: counts.confirmed || 0 },
    { key: "rejected", label: "Not received", count: counts.rejected || 0 },
    { key: "expired", label: "Not paid", count: counts.expired || 0 },
    { key: "all", label: "All" },
  ];

  const columns = [
    {
      title: "Order",
      key: "order",
      render: (_, r) => (
        <Link href={`/admin/orders/${r.orderId}`} className="font-medium text-ink" onClick={(e) => e.stopPropagation()}>
          #{r.orderNumber}
        </Link>
      ),
    },
    {
      title: "Customer",
      key: "buyer",
      render: (_, r) => (
        <div className="min-w-[150px]">
          <div className="text-[13.5px] text-ink">{r.buyerName || "—"}</div>
          <div className="text-[12px] text-ink-muted">{r.buyerPhone || r.buyerEmail || ""}</div>
        </div>
      ),
    },
    { title: "Amount", key: "amount", render: (_, r) => <span className="font-medium tabular-nums">{inr(r.amount)}</span> },
    {
      title: "UPI reference",
      key: "utr",
      render: (_, r) => (r.utr ? <code className="text-[12.5px] tracking-wide">{r.utr}</code> : <span className="text-ink-muted text-[12.5px]">—</span>),
    },
    { title: "Status", key: "status", render: (_, r) => <Tag color={STATUS[r.status]?.color}>{STATUS[r.status]?.label || r.status}</Tag> },
    { title: "When", key: "when", render: (_, r) => <span className="text-[12.5px] text-ink-muted whitespace-nowrap">{when(r.submittedAt || r.createdAt)}</span> },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_, r) =>
        r.status === "submitted" ? (
          <div className="flex justify-end gap-1.5">
            <Button size="small" type="primary" icon={<Check size={13} aria-hidden="true" />} loading={busy === `${r.id}:confirm`} onClick={() => act(r, "confirm")}>
              Received
            </Button>
            <Button size="small" danger icon={<X size={13} aria-hidden="true" />} loading={busy === `${r.id}:reject`} onClick={() => act(r, "reject")}>
              Not received
            </Button>
          </div>
        ) : r.status === "awaiting" || r.status === "expired" ? (
          <Tooltip title="The money arrived but the customer didn't report it">
            <Button size="small" loading={busy === `${r.id}:confirm`} onClick={() => act(r, "confirm")}>
              Received
            </Button>
          </Tooltip>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader title="UPI QR payments" backHref="/admin/apps" />

      {data.hiddenBy && (
        <Alert
          className="mb-5"
          type="info"
          showIcon
          message={`Not shown at checkout while ${data.hiddenBy} is live`}
          description={`${data.hiddenBy} already takes UPI and confirms it by itself, so shoppers see that instead. UPI QR comes back if you turn ${data.hiddenBy} off or put it in test mode.`}
        />
      )}
      {!ready || editing ? (
        <SetupCard
          settings={data.settings}
          onSaved={() => {
            setEditing(false);
            load();
          }}
          onCancel={ready ? () => setEditing(false) : null}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <Stat label="Received · 30 days" value={inr(s.collected30)} />
            <Stat label="Payments received" value={s.confirmed30} />
            <Stat label="To check" value={s.toCheck} warn={s.toCheck > 0} />
            <Stat label="QRs that got paid" value={s.conversion30 == null ? "—" : `${s.conversion30}%`} hint={`${s.started30} QRs shown in 30 days`} />
            <Stat label="Typical time to pay" value={duration(s.medianSecondsToPay)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 min-w-0">
              {s.toCheck > 0 && (
                <Alert
                  className="mb-4"
                  type="warning"
                  showIcon
                  message={`${s.toCheck} payment${s.toCheck === 1 ? "" : "s"} to check`}
                  description={
                    data.settings.autoSms
                      ? "Your bank's SMS didn't confirm these by itself (it hasn't come yet, or it couldn't be matched — see Automatic confirmation). Check the amount in your bank app, then press Received."
                      : "Find each amount in your UPI or bank app, then press Received. The customer's page moves on by itself."
                  }
                />
              )}
              <ListCard
                tabs={tabs}
                activeTab={tab}
                onTabChange={(k) => {
                  setTab(k);
                  setPage(1);
                }}
                toolbar={
                  <SearchInput
                    placeholder="UPI reference, name, phone"
                    onSearch={(v) => {
                      setPage(1);
                      setQ(v);
                    }}
                  />
                }
              >
                <Table
                  rowKey="id"
                  scroll={{ x: "max-content" }}
                  loading={loading}
                  columns={columns}
                  dataSource={data.payments}
                  rowClassName={(r) => (r.id === highlight ? "bg-[#FFFBEA]" : "")}
                  pagination={data.total > data.pageSize && { current: page, pageSize: data.pageSize, total: data.total, onChange: setPage, showSizeChanger: false }}
                  locale={{
                    emptyText: q ? (
                      <EmptyState icon={<Search />} title="Nothing matches" description="Try the full 12-digit reference, or the customer's name or phone." />
                    ) : (
                      <EmptyState icon={<QrCode />} title={tab === "submitted" ? "Nothing to check" : "No payments here yet"} description="UPI QR payments from checkout show up here." />
                    ),
                  }}
                />
              </ListCard>
            </div>

            <div className="flex flex-col gap-6 min-w-0">
              <Card size="small" title="Payments go to">
                <p className="m-0 text-[15px] font-semibold text-ink break-all">{data.settings.upiId}</p>
                <p className="m-0 text-[13px] text-ink-muted">{data.settings.payeeName} · QR valid {data.settings.minutes} min</p>
                <Button className="mt-3" size="small" onClick={() => setEditing(true)}>
                  Change
                </Button>
              </Card>
              <AutoSmsCard settings={data.settings} onChanged={load} />
              <Card size="small" title="Test it">
                <p className="mt-0 text-[13px] text-ink-muted">Scan this ₹1 QR with your phone to check the name and UPI ID shoppers will see.</p>
                {preview ? <div className="w-44 mx-auto [&_svg]:w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: preview }} /> : <Skeleton.Image active />}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint, warn }) {
  return (
    <div className="bg-app-surface border border-app-border rounded-[14px] shadow-card px-4 py-3 min-w-0">
      <p className="m-0 text-[12px] text-ink-muted truncate">{label}</p>
      <p className={`m-0 mt-1 text-[20px] font-semibold tabular-nums ${warn ? "text-[#B45309]" : "text-ink"}`}>{value}</p>
      {hint && <p className="m-0 text-[11.5px] text-ink-muted truncate">{hint}</p>}
    </div>
  );
}

function SetupCard({ settings, onSaved, onCancel }) {
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);

  async function save(values) {
    setSaving(true);
    try {
      await apiFetch("/api/upi-qr/settings", { method: "PUT", body: values });
      message.success("Saved — UPI QR now shows at checkout");
      onSaved();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Where should payments go?" className="max-w-2xl">
      <p className="mt-0 text-[13px] text-ink-muted">
        Shoppers pay this UPI ID directly — Oyklane never touches the money. You press Received when you see it arrive, or turn on automatic confirmation from
        your bank's SMS after saving.
      </p>
      <Form layout="vertical" requiredMark={false} initialValues={{ upiId: settings.upiId, payeeName: settings.payeeName, minutes: settings.minutes || 5 }} onFinish={save}>
        <Form.Item name="upiId" label="Your UPI ID" rules={[{ required: true, pattern: /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/, message: "Enter a UPI ID like yourname@okhdfcbank" }]}>
          <Input placeholder="yourname@okhdfcbank" autoComplete="off" />
        </Form.Item>
        <Form.Item name="payeeName" label="Name on the UPI account" rules={[{ required: true, min: 2, message: "Enter the account holder's name" }]} extra="Shoppers see it in their UPI app — use the name the bank shows, so they trust it.">
          <Input maxLength={60} />
        </Form.Item>
        <Form.Item name="minutes" label="QR valid for">
          <Select options={[3, 5, 10, 15].map((m) => ({ value: m, label: `${m} minutes` }))} />
        </Form.Item>
        <div className="flex gap-2">
          <Button type="primary" htmlType="submit" loading={saving}>
            Save
          </Button>
          {onCancel && <Button onClick={onCancel}>Cancel</Button>}
        </div>
      </Form>
    </Card>
  );
}

/** A bank that isn't on the built-in list: the sender its SMS come from. */
function BankSenders({ senders, onChanged }) {
  const { message } = App.useApp();
  const [value, setValue] = useState(senders[0] || "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await apiFetch("/api/upi-qr/bank-senders", { method: "PUT", body: { senders: value.trim() ? [value.trim()] : [] } });
      message.success("Saved");
      onChanged();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="m-0 mb-1 text-ink-muted">
        My bank's SMS sender <span className="text-[12px]">(only if your bank's SMS is ignored below — copy it from the message, like XYZBNK)</span>
      </p>
      <Space.Compact className="w-full">
        <Input size="small" value={value} maxLength={20} placeholder="XYZBNK" onChange={(e) => setValue(e.target.value)} />
        <Button size="small" loading={busy} onClick={save}>
          Save
        </Button>
      </Space.Compact>
    </div>
  );
}

/**
 * Automatic confirmation: the seller's phone forwards each bank SMS to a
 * secret link; a bank's "credited ₹X" SMS with an unused UPI reference
 * confirms the QR that asked for ₹X.
 */
function AutoSmsCard({ settings, onChanged }) {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const on = settings.autoSms;

  async function toggle(next) {
    setBusy(true);
    try {
      await apiFetch("/api/upi-qr/auto-sms", { method: "PUT", body: { on: next } });
      message.success(next ? "On — now set up your phone (steps below)" : "Turned off");
      onChanged();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const last = settings.lastSms;
  return (
    <Card
      size="small"
      title={
        <span className="inline-flex items-center gap-2">
          <MessageSquareText size={15} aria-hidden="true" /> Automatic confirmation
        </span>
      }
      extra={<Switch size="small" checked={on} loading={busy} onChange={toggle} aria-label="Automatic confirmation" />}
    >
      {!on ? (
        <p className="m-0 text-[13px] text-ink-muted">
          No more pressing Received: your phone forwards your bank's “credited” SMS to Oyklane, and the order is confirmed in seconds. The shopper's page moves
          on by itself — they don't type anything. Your phone must stay on and online.
        </p>
      ) : (
        <div className="flex flex-col gap-3 text-[13px]">
          <div>
            <p className="m-0 mb-1 text-ink-muted">Your secret link — anyone with it can confirm payments, so don't share it:</p>
            <div className="flex gap-1.5">
              <Input size="small" readOnly value={settings.smsUrl} className="font-mono text-[11.5px]" />
              <Button
                size="small"
                icon={<Copy size={13} aria-hidden="true" />}
                onClick={() => navigator.clipboard?.writeText(settings.smsUrl).then(() => message.success("Copied"))}
                aria-label="Copy link"
              />
            </div>
          </div>
          <div>
            <p className="m-0 font-medium text-ink">Android</p>
            <ol className="m-0 pl-5 text-ink-muted">
              <li>Install an SMS forwarder app (e.g. “SMS Forwarder” — free) on the phone that gets your bank's SMS.</li>
              <li>
                Add a rule: forward messages containing “credited” to a <b>webhook / URL</b> — paste the link above, and send it as JSON with both the sender and
                the text: <code className="text-[12px]">{`{"from":"%from%","text":"%text%"}`}</code>
              </li>
              <li>Send yourself ₹1 from another UPI ID: the result shows below.</li>
            </ol>
          </div>
          <div>
            <p className="m-0 font-medium text-ink">iPhone</p>
            <p className="m-0 text-ink-muted">
              Shortcuts ▸ Automation ▸ Message ▸ contains “credited” ▸ Run immediately ▸ “Get contents of URL”: the link above, method POST, request body JSON with{" "}
              <b>from</b> = Sender and <b>text</b> = Shortcut Input.
            </p>
          </div>
          <p className="m-0 text-ink-muted">
            Only an SMS from a bank, with a UPI reference that hasn't been used, confirms an order. Every QR asks a few paise less than the price (at most ₹0.99) so
            the amount points at one order. Anything else stays in “To check”, and the reason shows below.
          </p>
          <BankSenders senders={settings.bankSenders || []} onChanged={onChanged} />
          <div className={`rounded-[10px] px-3 py-2 ${last ? (last.ok ? "bg-[#ECFDF5] text-[#065F46]" : "bg-[#FFFBEA] text-[#92400E]") : "bg-app-bg text-ink-muted"}`}>
            {last ? (
              <>
                <b className="font-medium">Last SMS {when(last.at)}:</b> {last.note}
              </>
            ) : (
              "Nothing received yet."
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
