"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { App, Button, Card, Drawer, Input, InputNumber, Switch, Table, Tag } from "antd";
import { PageHeader } from "@shopcycle/ui";
import { formatCurrency } from "@/lib/money";
import { apiFetch } from "@/lib/api";

const FIELDS = [
  { key: "earnPct", label: "Points back on each order (%)", hint: "Of what the items cost after discounts; not shipping or tax.", min: 0, max: 50, step: 0.5 },
  { key: "pointValue", label: "What one point is worth", hint: "Money off when points are used.", min: 0.01, max: 100, step: 0.25, money: true },
  { key: "signupBonus", label: "Points for joining", hint: "Given once, when a shopper opens their account. 0 for none.", min: 0, max: 100000 },
  { key: "reviewBonus", label: "Points for a review", hint: "For a published review of something they bought. 0 for none.", min: 0, max: 100000 },
  { key: "minRedeem", label: "Fewest points to use at once", min: 1, max: 1000000 },
  { key: "maxRedeemPct", label: "Most of an order points can pay (%)", min: 1, max: 100 },
  { key: "expiryMonths", label: "Points lapse after (months without an order)", hint: "0 means they never lapse.", min: 0, max: 60 },
  { key: "codeDays", label: "A points code works for (days)", hint: "Unused codes give their points back.", min: 1, max: 365 },
];
const KIND = { order: "Order", signup: "Welcome", review: "Review", redeem: "Used for a code", refund: "Points back", reverse: "Taken back", expire: "Lapsed", adjust: "Changed by the store" };

/** Marketing ▸ Loyalty points (API loyalty/service.js). */
export default function LoyaltyPage() {
  const { message } = App.useApp();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);

  const load = useCallback(
    (term = "") =>
      apiFetch(`/api/loyalty?q=${encodeURIComponent(term)}`)
        .then((d) => {
          setData(d);
          setForm((f) => f || d.settings);
        })
        .catch((err) => message.error(err.message)),
    [message]
  );
  useEffect(() => {
    load();
  }, [load]);

  async function save(patch = {}) {
    setBusy(true);
    try {
      const d = await apiFetch("/api/loyalty/settings", { method: "PUT", body: { ...form, ...patch } });
      setForm(d.settings);
      message.success(d.settings.enabled ? "Saved. Shoppers earn points now." : "Saved");
      load(q);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!data || !form) return <Card loading />;
  const s = form;
  const example = Math.floor((1000 * Number(s.earnPct || 0)) / 100 / Number(s.pointValue || 1));

  return (
    <div>
      <PageHeader title="Loyalty points" subtitle="Shoppers earn points on what they buy and use them as a one-time code from their account. Points count once an order is delivered." />
      {!data.ready && <p className="mb-4 rounded-md border border-line bg-app-bg px-3 py-2 text-[13px]">Points start working once the database update for this release has run.</p>}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ["Points shoppers hold", data.outstanding.toLocaleString(), `Worth ${formatCurrency(data.worth)}`],
              ["On the way", (data.pending || 0).toLocaleString(), "From orders not delivered yet"],
              ["Used in the last 30 days", data.redeemed30.toLocaleString(), "Turned into codes"],
            ].map(([label, value, hint]) => (
              <Card key={label} size="small">
                <span className="block text-[12px] text-ink-muted">{label}</span>
                <span className="block text-[22px] font-semibold tabular-nums">{value}</span>
                <span className="block text-[12px] text-ink-muted">{hint}</span>
              </Card>
            ))}
          </div>

          <Card size="small" title="Members" extra={<Input.Search size="small" allowClear placeholder="Name, email or phone" className="!w-56" value={q} onChange={(e) => setQ(e.target.value)} onSearch={(v) => load(v)} />} styles={{ body: { padding: 0 } }}>
            <Table
              rowKey="customerId"
              size="middle"
              dataSource={data.members}
              pagination={{ pageSize: 25, hideOnSinglePage: true }}
              scroll={{ x: 600 }}
              locale={{ emptyText: s.enabled ? "No one has points yet. They earn them as their orders are delivered." : "Turn on points to start." }}
              columns={[
                {
                  title: "Customer",
                  render: (_, m) => (
                    <div className="text-[13px]">
                      <Link href={`/admin/customers/${m.customerId}`} className="font-medium text-ink hover:underline">
                        {m.name || m.email || m.phone || "Customer"}
                      </Link>
                      <span className="block text-ink-muted">{[m.email, m.phone].filter(Boolean).join(", ")}</span>
                    </div>
                  ),
                },
                { title: "Points", dataIndex: "points", width: 110, align: "right", render: (v) => <span className="tabular-nums">{v.toLocaleString()}</span> },
                { title: "Worth", width: 120, align: "right", render: (_, m) => formatCurrency(m.points * Number(s.pointValue)) },
                {
                  title: "",
                  width: 110,
                  align: "right",
                  render: (_, m) => (
                    <Button size="small" onClick={() => setOpen(m.customerId)}>
                      History
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        </div>

        <Card size="small" title="Program" className="xl:sticky xl:top-4">
          <label className="mb-4 flex items-start justify-between gap-3">
            <span>
              <span className="block text-sm font-medium">Points are {s.enabled ? "on" : "off"}</span>
              <span className="block text-[12px] text-ink-muted">Shoppers see their points in their account.</span>
            </span>
            <Switch checked={s.enabled} loading={busy} onChange={(enabled) => (setForm({ ...s, enabled }), save({ enabled }))} aria-label="Points on" />
          </label>
          <div className="flex flex-col gap-3">
            {FIELDS.map((f) => (
              <label key={f.key}>
                <span className="mb-1 block text-[12px] text-ink-muted">{f.label}</span>
                <InputNumber className="!w-full" min={f.min} max={f.max} step={f.step || 1} value={s[f.key]} onChange={(v) => setForm({ ...s, [f.key]: v ?? f.min })} prefix={f.money ? "₹" : undefined} />
                {f.hint && <span className="mt-0.5 block text-[12px] text-ink-subtle">{f.hint}</span>}
              </label>
            ))}
          </div>
          <p className="mb-3 mt-4 rounded-md bg-app-bg px-3 py-2 text-[12px]">
            A {formatCurrency(1000)} order earns {example} points, worth {formatCurrency(example * Number(s.pointValue || 0))}.
          </p>
          <Button type="primary" block loading={busy} onClick={() => save()}>
            Save
          </Button>
        </Card>
      </div>

      {open && <MemberDrawer customerId={open} pointValue={s.pointValue} onClose={() => setOpen(null)} onChanged={() => load(q)} />}
    </div>
  );
}

function MemberDrawer({ customerId, pointValue, onClose, onChanged }) {
  const { message } = App.useApp();
  const [d, setD] = useState(null);
  const [adj, setAdj] = useState({ points: null, note: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    apiFetch(`/api/loyalty/customers/${customerId}`)
      .then(setD)
      .catch((err) => message.error(err.message));
  }, [customerId, message]);
  async function adjust() {
    setBusy(true);
    try {
      const r = await apiFetch("/api/loyalty/adjust", { method: "POST", body: { customerId, ...adj } });
      setD(r);
      setAdj({ points: null, note: "" });
      message.success("Points changed");
      onChanged();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Drawer open width={540} title={d ? d.customer.name || d.customer.email || "Customer" : "Points"} onClose={onClose}>
      {!d ? null : (
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-semibold tabular-nums">{d.points.toLocaleString()}</span>
            <span className="text-[13px] text-ink-muted">points, worth {formatCurrency(d.points * Number(pointValue))}</span>
            {d.pending > 0 && <Tag className="!ml-auto">{d.pending} on the way</Tag>}
          </div>
          <Card size="small" title="Add or take away points">
            <div className="grid grid-cols-[120px_1fr_auto] items-end gap-2">
              <label>
                <span className="mb-1 block text-[12px] text-ink-muted">Points</span>
                <InputNumber className="!w-full" value={adj.points} onChange={(points) => setAdj({ ...adj, points })} placeholder="50 or -50" />
              </label>
              <label>
                <span className="mb-1 block text-[12px] text-ink-muted">Reason (they see it)</span>
                <Input maxLength={200} value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} placeholder="e.g. Sorry for the late delivery" />
              </label>
              <Button type="primary" loading={busy} disabled={!adj.points} onClick={adjust}>
                Save
              </Button>
            </div>
          </Card>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={d.entries}
            locale={{ emptyText: "No points yet" }}
            columns={[
              { title: "Date", dataIndex: "createdAt", width: 110, render: (v) => new Date(v).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) },
              {
                title: "",
                render: (_, e) => (
                  <span className="text-[13px]">
                    {KIND[e.kind] || e.kind} {e.status === "pending" && <Tag className="!ml-1">On the way</Tag>} {e.status === "cancelled" && <Tag className="!ml-1">Cancelled</Tag>}
                    {e.note && <span className="block text-ink-muted">{e.note}</span>}
                  </span>
                ),
              },
              { title: "Points", dataIndex: "points", width: 90, align: "right", render: (v) => <span className={`tabular-nums ${v < 0 ? "text-red-600" : ""}`}>{v > 0 ? `+${v}` : v}</span> },
            ]}
          />
        </div>
      )}
    </Drawer>
  );
}
