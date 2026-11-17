"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Checkbox, Button, Alert, App, Select, Input, Table, Tag, Segmented, Progress } from "antd";
import { apiFetch } from "@/lib/api";

const STATUS = { done: { color: "green", label: "Translated" }, pending: { color: "gold", label: "Waiting" }, failed: { color: "red", label: "Couldn't translate" } };

/**
 * Settings ▸ Markets and languages ▸ Languages: the extra languages shoppers
 * can pick (/de/…, /fr/… on the same address — one login, one cart), and
 * every line of the storefront in each, which the seller can rewrite.
 */
export function Languages({ initial, canEdit }) {
  const { message } = App.useApp();
  const [list, setList] = useState(initial.list || []);
  const [saving, setSaving] = useState(false);
  const baseName = initial.options.find((o) => o.code === initial.base)?.name || initial.base;

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/api/store", { method: "PATCH", body: { settings: { languages: { list } } } });
      message.success(list.length ? "Languages saved. Pages are translated as shoppers visit them." : "Your store shows one language");
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card size="small" styles={{ body: { padding: 24 } }}>
        <h3 className="m-0 text-[15px] font-medium text-ink">Languages</h3>
        <p className="m-0 mt-1 text-[13px] text-ink-muted">
          Your store is in {baseName}. Add languages and shoppers get a language menu; each one has its own address on your domain (like /de/), with one login and one cart across all of them.
        </p>
        {!initial.ai && (
          <Alert className="mt-3" type="warning" showIcon message="Automatic translation isn't switched on for Oyklane yet, so pages stay in your language until you write the translations below." />
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {initial.options
            .filter((o) => o.code !== initial.base)
            .map((o) => {
              const p = initial.progress?.[o.code] || {};
              const total = (p.done || 0) + (p.pending || 0) + (p.failed || 0);
              return (
                <label key={o.code} className="flex items-center justify-between gap-3 rounded-lg border border-app-border px-3 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <Checkbox checked={list.includes(o.code)} disabled={!canEdit} onChange={(e) => setList((l) => (e.target.checked ? [...l, o.code] : l.filter((c) => c !== o.code)))} />
                    <span className="text-[14px] text-ink">
                      {o.native} <span className="text-ink-muted">· {o.name}</span>
                    </span>
                  </span>
                  {list.includes(o.code) && total > 0 && <Progress type="circle" size={26} percent={Math.round(((p.done || 0) / total) * 100)} />}
                </label>
              );
            })}
        </div>
        {canEdit && (
          <Button className="mt-4" type="primary" loading={saving} onClick={save}>
            Save languages
          </Button>
        )}
      </Card>
      {(initial.list || []).length > 0 && <Translations langs={initial.list} options={initial.options} canEdit={canEdit} />}
    </>
  );
}

function Translations({ langs, options, canEdit }) {
  const { message } = App.useApp();
  const [lang, setLang] = useState(langs[0]);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(null);

  const load = useCallback(async () => {
    setData(null);
    try {
      setData(await apiFetch(`/api/store/translations?lang=${lang}&q=${encodeURIComponent(q)}&page=${page}${status === "all" ? "" : `&status=${status}`}`));
    } catch (err) {
      message.error(err.message);
    }
  }, [lang, q, page, status, message]);
  useEffect(() => {
    load();
  }, [load]);

  async function save(row) {
    setSaving(row.id);
    try {
      const saved = await apiFetch(`/api/store/translations/${row.id}`, { method: "PUT", body: { text: edits[row.id] } });
      setData((d) => ({ ...d, rows: d.rows.map((r) => (r.id === row.id ? saved : r)) }));
      setEdits(({ [row.id]: _, ...rest }) => rest);
      message.success(saved.text ? "Translation saved" : "Back to the automatic translation");
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(null);
    }
  }

  async function retry() {
    try {
      const r = await apiFetch("/api/store/translations/retry", { method: "POST", body: { lang } });
      message.success(r.retried ? `${r.retried} lines will be tried again` : "Nothing to try again");
      load();
    } catch (err) {
      message.error(err.message);
    }
  }

  return (
    <Card size="small" styles={{ body: { padding: 24 } }}>
      <h3 className="m-0 text-[15px] font-medium text-ink">Translations</h3>
      <p className="m-0 mt-1 text-[13px] text-ink-muted">
        Every line shoppers have seen on your store. New text is translated automatically within a few minutes of the first visit; change any line to your own words.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select value={lang} onChange={(v) => (setPage(1), setLang(v))} options={langs.map((l) => ({ value: l, label: options.find((o) => o.code === l)?.native || l }))} className="min-w-[140px]" />
        <Segmented
          value={status}
          onChange={(v) => (setPage(1), setStatus(v))}
          options={[
            { value: "all", label: "All" },
            { value: "pending", label: "Waiting" },
            { value: "failed", label: "Couldn't translate" },
          ]}
        />
        <Input.Search placeholder="Search text" allowClear className="max-w-xs" onSearch={(v) => (setPage(1), setQ(v))} />
        {status === "failed" && canEdit && <Button onClick={retry}>Try again</Button>}
      </div>
      <Table
        className="mt-3"
        size="small"
        rowKey="id"
        loading={!data}
        dataSource={data?.rows || []}
        scroll={{ x: 640 }}
        pagination={{ current: page, pageSize: 50, total: data?.total || 0, onChange: setPage, size: "small", showSizeChanger: false }}
        columns={[
          { title: "Your text", dataIndex: "source", width: "42%", render: (v) => <span className="text-[13px] text-ink">{v}</span> },
          {
            title: "Translation",
            key: "text",
            render: (_, r) => (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 6 }}
                disabled={!canEdit}
                placeholder={r.status === "pending" ? "Translating…" : "Write a translation"}
                value={edits[r.id] !== undefined ? edits[r.id] : r.text || ""}
                onChange={(e) => setEdits((x) => ({ ...x, [r.id]: e.target.value }))}
              />
            ),
          },
          {
            title: "",
            key: "status",
            width: 150,
            align: "right",
            render: (_, r) =>
              edits[r.id] !== undefined ? (
                <Button size="small" type="primary" loading={saving === r.id} onClick={() => save(r)}>
                  Save
                </Button>
              ) : r.origin === "seller" ? (
                <Tag className="!m-0">Your words</Tag>
              ) : (
                <Tag color={STATUS[r.status]?.color} className="!m-0">
                  {STATUS[r.status]?.label}
                </Tag>
              ),
          },
        ]}
      />
    </Card>
  );
}
