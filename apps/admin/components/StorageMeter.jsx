"use client";

import { useEffect, useState } from "react";
import { App, Button, InputNumber, Modal, Progress, Segmented, Skeleton } from "antd";
import { HardDrive, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/** Extra space on top of the plan, ₹20 a GB a month, billed with the plan. */
function BuySpace({ open, onClose, usage, onSaved }) {
  const { message } = App.useApp();
  const [gb, setGb] = useState(usage?.addon?.gb || 5);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setGb(usage?.addon?.gb || 5);
  }, [open, usage]);
  if (!usage) return null;
  const price = usage.addon.pricePerGb;
  const current = usage.addon.gb;
  async function save(next) {
    setSaving(true);
    try {
      const r = await apiFetch("/api/billing/storage", { method: "PUT", body: { gb: next } });
      message.success(next ? `Your storage is now ${r.usage.label.limit}` : "Extra storage removed from your next bill");
      onSaved(r.usage);
      onClose();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Buy more storage"
      okText={gb > current ? `Add ${gb - current} GB` : gb < current ? `Change to ${gb} GB` : "Save"}
      confirmLoading={saving}
      onOk={() => save(gb)}
      okButtonProps={{ disabled: gb === current }}
      destroyOnHidden
    >
      <p className="mt-0 text-[13.5px] text-ink-muted">
        Your {usage.plan} plan includes {usage.planGb} GB. Add more space for {inr(price)} a GB a month, billed with your plan. It&apos;s ready as soon as you add it; lower it any time and your next bill changes.
      </p>
      <Segmented
        block
        value={[5, 10, 25, 50].includes(gb) ? gb : "other"}
        onChange={(v) => v !== "other" && setGb(v)}
        options={[5, 10, 25, 50].map((v) => ({ value: v, label: `${v} GB` })).concat({ value: "other", label: "Other" })}
        className="mb-3"
      />
      <div className="flex flex-wrap items-center gap-3">
        <InputNumber min={0} max={usage.addon.maxGb} value={gb} onChange={(v) => setGb(Math.max(0, Math.round(Number(v) || 0)))} addonAfter="GB extra" className="!w-48" />
        <span className="text-[14px] text-ink">
          <b className="tabular-nums">{inr(gb * price)}</b> a month + GST
        </span>
      </div>
      <p className="mb-0 mt-3 text-[13px] text-ink-muted tabular-nums">
        Total space: {usage.planGb + gb} GB · you&apos;re using {usage.label.used}
      </p>
      {current > 0 && (
        <Button type="link" danger className="mt-2 !px-0" loading={saving} onClick={() => save(0)}>
          Remove extra storage
        </Button>
      )}
    </Modal>
  );
}

/** Media storage on the store's plan: how much is used and how much is left.
 *  `refreshKey` changes (e.g. after an upload or delete) fetch it again. */
export function StorageMeter({ refreshKey = 0, className = "" }) {
  const [u, setU] = useState(null);
  const [buying, setBuying] = useState(false);
  useEffect(() => {
    apiFetch("/api/files/usage")
      .then((d) => setU(d.usage))
      .catch(() => setU(false));
  }, [refreshKey]);
  if (u === false) return null;
  if (!u) return <Skeleton.Input active block className={className} style={{ height: 76 }} />;
  const tone = u.percent >= 95 ? "exception" : u.percent >= 80 ? "active" : "normal";
  const color = u.percent >= 95 ? "#DC2626" : u.percent >= 80 ? "#D97706" : "#18181B";
  return (
    <div className={`rounded-[14px] border border-app-border bg-app-surface px-5 py-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="m-0 flex items-center gap-2 text-[14px] font-semibold text-ink">
          <HardDrive size={15} className="text-ink-muted" aria-hidden="true" />
          Media storage
        </p>
        <div className="flex items-center gap-3">
          <p className="m-0 text-[13px] text-ink-muted tabular-nums">
            <b className="font-semibold text-ink">{u.label.used}</b> of {u.label.limit} used · {u.label.left} left
          </p>
          <Button size="small" type={u.percent >= 80 ? "primary" : "default"} icon={<Plus size={13} aria-hidden="true" />} onClick={() => setBuying(true)}>
            {u.addon?.gb ? "Change storage" : "Buy more"}
          </Button>
        </div>
      </div>
      <Progress percent={u.percent} showInfo={false} status={tone} strokeColor={color} className="!mb-0 !mt-2" aria-label={`${u.percent}% of media storage used`} />
      <p className="m-0 mt-1 text-[12.5px] text-ink-muted">
        {u.files.count} file{u.files.count === 1 ? "" : "s"}
        {u.videos.count ? ` and ${u.videos.count} video${u.videos.count === 1 ? "" : "s"}` : ""} · {u.planGb} GB on the {u.plan} plan
        {u.addon?.gb ? ` + ${u.addon.gb} GB extra (${inr(u.addon.monthly)} a month)` : ""}. Photos are made smaller when you upload them, without a visible change.
      </p>
      <BuySpace open={buying} onClose={() => setBuying(false)} usage={u} onSaved={setU} />
    </div>
  );
}
