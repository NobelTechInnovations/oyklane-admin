"use client";

import { useCallback, useEffect, useState } from "react";
import { App, Button, Card, InputNumber, Modal, Skeleton, Table, Tag } from "antd";
import { ArrowDownLeft, ArrowUpRight, Plus, Wallet } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { openCheckout, submitPayu } from "@/lib/billing";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const when = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const KIND = { topup: ["Money added", "green"], debit: ["Courier booked", "default"], refund: ["Refund", "blue"], adjust: ["Adjusted by oyklane", "purple"] };

/** Adds money through Oyklane's payment gateway. Resolves with the new
 * balance, or null when the window was closed. PayU leaves the page and
 * comes back to Settings ▸ Shipping. */
export async function topUp(amount) {
  const started = await apiFetch("/api/shipping/oyklane/wallet/topup", { method: "POST", body: { amount } });
  if (started.added) return started.balance;
  if (started.checkout?.provider === "payu") {
    submitPayu(started.checkout);
    return new Promise(() => {});
  }
  let paid;
  try {
    paid = await openCheckout(started.checkout);
  } catch (err) {
    if (err.cancelled) return null;
    throw err;
  }
  const v = await apiFetch("/api/shipping/oyklane/wallet/verify", { method: "POST", body: paid });
  if (!v.added) throw new Error("Your payment is being confirmed — the money shows in your wallet within a few minutes.");
  return v.balance;
}

/** "Add money": a few amounts to pick from, at least the minimum. */
export function AddMoneyDialog({ open, onClose, minTopup = 200, suggest = 0, onAdded }) {
  const { message } = App.useApp();
  const presets = [...new Set([Math.max(minTopup, Math.ceil(suggest / 100) * 100), 500, 1000, 2000, 5000])].filter((v) => v >= minTopup).sort((a, b) => a - b).slice(0, 4);
  const [amount, setAmount] = useState(presets[0]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setAmount(presets[0]);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function pay() {
    setBusy(true);
    try {
      const balance = await topUp(amount);
      if (balance == null) return;
      message.success(`Added ${inr(amount)} — wallet balance ${inr(balance)}`);
      onAdded?.(balance);
      onClose?.();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onCancel={onClose} title="Add money to your shipping wallet" width={440} footer={null} destroyOnHidden>
      <div className="mb-4 flex flex-wrap gap-2">
        {presets.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setAmount(v)}
            className={`h-10 min-w-[84px] rounded-lg border px-3 text-[14px] font-medium tabular-nums transition-colors ${amount === v ? "border-[#1F5FD6] bg-[#F0F5FD] text-[#1F5FD6]" : "border-app-border bg-white text-ink hover:border-ink-muted"}`}
          >
            {inr(v)}
          </button>
        ))}
      </div>
      <label className="block text-[12.5px] text-ink-muted">
        Or enter an amount
        <InputNumber className="!mt-1 !block !w-full" size="large" min={minTopup} max={200000} prefix="₹" value={amount} onChange={(v) => setAmount(v || minTopup)} />
      </label>
      <p className="mb-0 mt-2 text-[12px] text-ink-muted">At least {inr(minTopup)}. Paid securely to Oyklane by UPI, card or net banking.</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" loading={busy} disabled={!(amount >= minTopup)} onClick={pay}>
          Pay {inr(amount)}
        </Button>
      </div>
    </Modal>
  );
}

/** Settings ▸ Shipping ▸ Wallet: the balance, add money, every movement. */
export function ShippingWalletPanel({ onBalance }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const load = useCallback(
    (p = page) =>
      apiFetch(`/api/shipping/oyklane/wallet?page=${p}`)
        .then((d) => {
          setData(d);
          onBalance?.(d.balance);
        })
        .catch((err) => setData({ error: err.message })),
    [page, onBalance],
  );
  useEffect(() => {
    load(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <Skeleton active paragraph={{ rows: 4 }} />;
  if (data.error) return <p className="text-[13px] text-red-600">{data.error}</p>;
  if (!data.enabled) return null;
  const low = data.balance < 100;

  return (
    <div className="flex flex-col gap-4">
      <Card size="small" styles={{ body: { padding: 20 } }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1F5FD6]">
              <Wallet size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="m-0 text-[12.5px] text-ink-muted">Shipping wallet balance</p>
              <p className="m-0 text-[26px] font-semibold leading-tight tabular-nums text-ink">{inr(data.balance)}</p>
            </div>
          </div>
          <Button type="primary" size="large" icon={<Plus size={16} aria-hidden="true" />} onClick={() => setAdding(true)}>
            Add money
          </Button>
        </div>
        <p className={`m-0 mt-3 text-[12.5px] ${low ? "text-[#B45309]" : "text-ink-muted"}`}>
          {low ? "Your balance is low — add money so couriers can be booked without a hitch. " : ""}
          Each courier you book is paid from here. Cancel before pickup and the amount comes back at once.
        </p>
      </Card>
      <Card size="small" title="Wallet activity" styles={{ body: { padding: 0 } }}>
        <Table
          size="small"
          rowKey="id"
          dataSource={data.entries}
          locale={{ emptyText: "Nothing yet — add money to start." }}
          pagination={data.total > 25 ? { current: page, pageSize: 25, total: data.total, onChange: setPage, showSizeChanger: false } : false}
          columns={[
            { title: "When", dataIndex: "at", render: when, width: 150 },
            {
              title: "What",
              key: "what",
              render: (_, r) => {
                const [label, color] = KIND[r.kind] || [r.kind, "default"];
                return (
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <Tag color={color} className="!m-0">{label}</Tag>
                    <span className="text-[12.5px] text-ink-muted">{[r.orderNumber && `Order #${r.orderNumber}`, r.kind !== "topup" && r.reference && `AWB ${r.reference}`, r.note && !KIND[r.kind]?.[0].startsWith(r.note) && r.note].filter(Boolean).join(" · ")}</span>
                  </span>
                );
              },
            },
            {
              title: "Amount",
              dataIndex: "amount",
              align: "right",
              render: (v) => (
                <span className={`inline-flex items-center gap-1 tabular-nums font-medium ${v >= 0 ? "text-[#15803D]" : "text-ink"}`}>
                  {v >= 0 ? <ArrowDownLeft size={13} aria-hidden="true" /> : <ArrowUpRight size={13} aria-hidden="true" />}
                  {v >= 0 ? "+" : "−"}
                  {inr(Math.abs(v))}
                </span>
              ),
            },
            { title: "Balance", dataIndex: "balanceAfter", align: "right", render: (v) => (v == null ? "—" : <span className="tabular-nums text-ink-muted">{inr(v)}</span>) },
          ]}
        />
      </Card>
      <AddMoneyDialog open={adding} onClose={() => setAdding(false)} minTopup={data.minTopup} onAdded={() => (page === 1 ? load(1) : setPage(1))} />
    </div>
  );
}
