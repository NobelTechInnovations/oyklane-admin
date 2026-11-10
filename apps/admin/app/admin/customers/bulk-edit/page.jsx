"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { App, Alert, Button, Checkbox, Input, Skeleton } from "antd";
import { Save } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";

const TEXT = [
  { key: "name", label: "Name", width: 190 },
  { key: "email", label: "Email", width: 230 },
  { key: "phone", label: "Phone", width: 150 },
  { key: "city", label: "City", width: 130 },
  { key: "province", label: "State", width: 130 },
  { key: "zip", label: "PIN", width: 90 },
];
const CONSENT = [
  { key: "acceptsEmailMarketing", label: "Email offers" },
  { key: "acceptsSmsMarketing", label: "SMS offers" },
  { key: "acceptsWhatsappMarketing", label: "WhatsApp offers" },
];

function Editor() {
  const params = useSearchParams();
  const { message, modal } = App.useApp();
  const ids = (params.get("ids") || "").split(",").filter(Boolean);
  const [rows, setRows] = useState(null);
  const [edits, setEdits] = useState({}); // id → { field: value }
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState([]);

  const load = () =>
    apiFetch(`/api/customers/bulk-edit?ids=${ids.join(",")}`)
      .then((d) => setRows(d.customers))
      .catch((err) => {
        message.error(err.message);
        setRows([]);
      });
  useEffect(() => {
    if (!ids.length) setRows([]);
    else load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = (r, k) => (edits[r.id] && k in edits[r.id] ? edits[r.id][k] : r[k]);
  const set = (r, k, v) =>
    setEdits((e) => {
      const row = { ...(e[r.id] || {}) };
      if (v === r[k] || (v === "" && r[k] == null)) delete row[k];
      else row[k] = v;
      const next = { ...e };
      if (Object.keys(row).length) next[r.id] = row;
      else delete next[r.id];
      return next;
    });
  const changes = Object.values(edits).reduce((t, r) => t + Object.keys(r).length, 0);
  const allOn = (k) => rows?.length > 0 && rows.every((r) => value(r, k));
  const someOn = (k) => rows?.some((r) => value(r, k));

  useEffect(() => {
    if (!changes) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changes]);

  async function save() {
    setSaving(true);
    try {
      const r = await apiFetch("/api/customers/bulk-edit", { method: "PUT", body: { customers: Object.entries(edits).map(([id, f]) => ({ id, ...f })) } });
      setFailed(r.failed || []);
      if (r.failed?.length) message.warning(`Saved ${r.changed}; ${r.failed.length} couldn't be saved`);
      else message.success(`Saved ${r.changed} customer${r.changed === 1 ? "" : "s"}`);
      const bad = new Set((r.failed || []).map((f) => f.id));
      setEdits((e) => Object.fromEntries(Object.entries(e).filter(([id]) => bad.has(id))));
      await load();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function confirmConsent(k, on) {
    const apply = () => rows.forEach((r) => set(r, k, on));
    if (!on) return apply();
    modal.confirm({
      title: `Mark all ${rows.length} as agreeing to ${CONSENT.find((c) => c.key === k).label.toLowerCase()}?`,
      content: "Only do this for customers who told you they want offers from you — sending offers to people who didn't agree breaks WhatsApp's and India's SMS rules and gets numbers blocked.",
      okText: "They agreed",
      onOk: apply,
    });
  }

  if (!rows) return <Skeleton active paragraph={{ rows: 8 }} />;
  return (
    <div>
      <PageHeader
        title={`Bulk edit · ${rows.length} customer${rows.length === 1 ? "" : "s"}`}
        backHref="/admin/customers"
        actions={
          <>
            {changes > 0 && <Button onClick={() => setEdits({})}>Discard</Button>}
            <Button type="primary" icon={<Save size={14} aria-hidden="true" />} disabled={!changes} loading={saving} onClick={save}>
              Save{changes ? ` ${changes} change${changes === 1 ? "" : "s"}` : ""}
            </Button>
          </>
        }
      />
      {failed.length > 0 && (
        <Alert
          className="mb-3"
          type="warning"
          showIcon
          message="Some rows weren't saved"
          description={
            <ul className="m-0 pl-4">
              {failed.map((f) => (
                <li key={f.id}>
                  {rows.find((r) => r.id === f.id)?.name || f.id}: {f.error}
                </li>
              ))}
            </ul>
          }
        />
      )}
      {!rows.length ? (
        <p className="text-ink-muted">Select customers on the Customers page, then choose Bulk edit.</p>
      ) : (
        <div className="overflow-auto rounded-[12px] border border-app-border bg-white max-h-[calc(100vh-190px)]">
          <table className="w-max min-w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-[#F7F8FA]">
              <tr>
                {TEXT.map((c) => (
                  <th key={c.key} className="border-b border-l first:border-l-0 border-app-border px-2 py-2 text-left font-medium text-ink" style={{ minWidth: c.width }}>
                    {c.label}
                  </th>
                ))}
                {CONSENT.map((c) => (
                  <th key={c.key} className="border-b border-l border-app-border px-3 py-2 text-left font-medium text-ink whitespace-nowrap">
                    <Checkbox checked={allOn(c.key)} indeterminate={!allOn(c.key) && someOn(c.key)} onChange={(e) => confirmConsent(c.key, e.target.checked)}>
                      {c.label}
                    </Checkbox>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-app-border/70">
                  {TEXT.map((c) => {
                    const changed = edits[r.id] && c.key in edits[r.id];
                    return (
                      <td key={c.key} className="border-l first:border-l-0 border-app-border/60 px-1.5 py-1" style={{ minWidth: c.width }}>
                        <Input size="small" className={changed ? "!bg-[#FFF8E6] !border-[#E9B949]" : ""} value={value(r, c.key) ?? ""} onChange={(e) => set(r, c.key, e.target.value)} />
                      </td>
                    );
                  })}
                  {CONSENT.map((c) => {
                    const changed = edits[r.id] && c.key in edits[r.id];
                    return (
                      <td key={c.key} className={`border-l border-app-border/60 px-3 py-1 ${changed ? "bg-[#FFF8E6]" : ""}`}>
                        <Checkbox checked={Boolean(value(r, c.key))} onChange={(e) => set(r, c.key, e.target.checked)} aria-label={`${r.name}: ${c.label}`} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[12px] text-ink-muted">Changed cells turn yellow. When WhatsApp consent changes, the date and “admin” are kept as the record.</p>
    </div>
  );
}

/** Customers ▸ Bulk edit — the selected customers in one editable table. */
export default function CustomerBulkEditPage() {
  return (
    <Suspense fallback={<Skeleton active />}>
      <Editor />
    </Suspense>
  );
}
