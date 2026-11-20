"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, Input, Select, Switch } from "antd";
import { Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

const TYPES = [
  { value: "text", label: "Text" },
  { value: "select", label: "Choice" },
  { value: "checkbox", label: "Tick box" },
];

/** Settings ▸ Checkout ▸ Extra fields: questions the buyer answers at checkout, kept on the order (API checkout/fields.js). */
export function ExtraFields({ canEdit }) {
  const { message } = App.useApp();
  const [fields, setFields] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    apiFetch("/api/store/checkout-fields").then((d) => setFields(d.fields)).catch(() => setFields([]));
  }, []);
  const set = (k, patch) => setFields(fields.map((f, j) => (j === k ? { ...f, ...patch } : f)));
  async function save() {
    setBusy(true);
    try {
      const d = await apiFetch("/api/store/checkout-fields", { method: "PUT", body: { fields: fields.map((f) => ({ ...f, options: typeof f.options === "string" ? f.options : (f.options || []).join(", ") })) } });
      setFields(d.fields);
      message.success("Saved. Checkout shows them now.");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  if (!fields) return <Card size="small" loading className="mt-6" />;
  return (
    <Card size="small" title="Extra checkout fields" className="mt-6">
      <p className="m-0 mb-3 text-[13px] text-ink-muted">Ask buyers something at checkout, like a gift message, a preferred delivery date or a name for the bill. Answers show on the order. Apps can add fields too.</p>
      <div className="flex flex-col gap-3">
        {fields.map((f, k) => (
          <div key={k} className="grid grid-cols-1 gap-2 rounded-md border border-line p-3 sm:grid-cols-[1fr_130px_auto_auto] sm:items-end">
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Question</span>
              <Input disabled={!canEdit} value={f.label} maxLength={80} placeholder="e.g. Gift message" onChange={(e) => set(k, { label: e.target.value })} />
            </label>
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Type</span>
              <Select disabled={!canEdit} className="!w-full" value={f.type} onChange={(type) => set(k, { type })} options={TYPES} />
            </label>
            <label className="flex items-center gap-2 pb-1 text-[13px]">
              <Switch size="small" disabled={!canEdit} checked={Boolean(f.required)} onChange={(required) => set(k, { required })} />
              Required
            </label>
            {canEdit && <Button type="text" danger icon={<Trash2 size={14} />} aria-label="Remove field" onClick={() => setFields(fields.filter((_, j) => j !== k))} />}
            {f.type === "select" && (
              <label className="sm:col-span-4">
                <span className="mb-1 block text-[12px] text-ink-muted">Choices (comma separated)</span>
                <Input disabled={!canEdit} value={Array.isArray(f.options) ? f.options.join(", ") : f.options || ""} placeholder="Morning, Afternoon, Evening" onChange={(e) => set(k, { options: e.target.value })} />
              </label>
            )}
          </div>
        ))}
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button size="small" icon={<Plus size={13} />} disabled={fields.length >= 10} onClick={() => setFields([...fields, { label: "", type: "text", required: false }])}>
              Add a field
            </Button>
            <Button size="small" type="primary" loading={busy} onClick={save}>
              Save
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
