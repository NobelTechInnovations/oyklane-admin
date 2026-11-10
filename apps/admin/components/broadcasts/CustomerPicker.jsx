"use client";

import { useEffect, useRef, useState } from "react";
import { Input, Table, Tag, Button } from "antd";
import { Search, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

const CONSENT = { email: "acceptsEmailMarketing", sms: "acceptsSmsMarketing", whatsapp: "acceptsWhatsappMarketing" };
const CONTACT = { email: (c) => c.email, sms: (c) => c.phone, whatsapp: (c) => c.phone };

/**
 * Pick customers one by one for a broadcast: search, tick, and the picks
 * stay picked across searches and pages. Each row says whether that
 * customer agreed to this channel — only those who did get the message.
 * value = array of customer ids.
 */
export function CustomerPicker({ channel, value = [], onChange }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ customers: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const known = useRef(new Map());
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const d = await apiFetch(`/api/customers?pageSize=50&page=${page}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`);
        for (const c of d.customers) known.current.set(c.id, c);
        setData({ customers: d.customers, total: d.total });
      } catch {
        setData({ customers: [], total: 0 });
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer.current);
  }, [q, page]);

  const picked = new Set(value);
  const agreed = (c) => Boolean(c[CONSENT[channel]]) && Boolean(CONTACT[channel](c));
  const set = (ids) => onChange?.([...ids]);
  const chips = value.slice(0, 12).map((id) => known.current.get(id)).filter(Boolean);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          allowClear
          className="max-w-sm"
          prefix={<Search size={14} className="text-ink-subtle" aria-hidden="true" />}
          placeholder="Search name, email or phone"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <span className="text-[13px] text-ink-muted tabular-nums">{value.length} picked</span>
        {value.length > 0 && (
          <Button size="small" type="link" onClick={() => set([])}>
            Clear
          </Button>
        )}
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <Tag key={c.id} className="m-0 inline-flex items-center gap-1" closable closeIcon={<X size={11} aria-label={`Remove ${c.name || c.email}`} />} onClose={() => set(value.filter((x) => x !== c.id))}>
              {c.name || c.email || c.phone}
            </Tag>
          ))}
          {value.length > chips.length && <Tag className="m-0" bordered={false}>+{value.length - chips.length} more</Tag>}
        </div>
      )}
      <Table
        size="small"
        rowKey="id"
        loading={loading}
        dataSource={data.customers}
        scroll={{ y: 300 }}
        pagination={{ current: page, pageSize: 50, total: data.total, onChange: setPage, showSizeChanger: false, size: "small" }}
        rowSelection={{
          selectedRowKeys: value,
          preserveSelectedRowKeys: true,
          onSelect: (row, on) => set(on ? [...picked, row.id] : value.filter((x) => x !== row.id)),
          onSelectAll: (on, _rows, changed) => {
            const ids = changed.map((r) => r.id);
            set(on ? [...new Set([...value, ...ids])] : value.filter((x) => !ids.includes(x)));
          },
        }}
        columns={[
          { title: "Customer", render: (_, c) => <span className="text-[13px]">{c.name || "—"}<span className="block text-[12px] text-ink-muted">{CONTACT[channel](c) || "No " + (channel === "email" ? "email" : "phone")}</span></span> },
          {
            title: "Agreed",
            width: 110,
            render: (_, c) => (agreed(c) ? <Tag color="green" className="m-0">Yes</Tag> : <Tag className="m-0">No — left out</Tag>),
          },
        ]}
      />
    </div>
  );
}
