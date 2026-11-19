"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { App, Button, Card, Input, InputNumber, Modal, Popconfirm, Select, Switch, Table, Tag } from "antd";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { SettingsSectionHeader } from "../SettingsNav";

const EMPTY = { name: "", address1: "", city: "", province: "", zip: "", phone: "", priority: 0, active: true };

/** Settings ▸ Locations: where stock is kept, the order they ship from, and moving stock between them. */
export default function LocationsPage() {
  const { message } = App.useApp();
  const [locations, setLocations] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [transfers, setTransfers] = useState([]);

  const load = useCallback(() => {
    apiFetch("/api/locations").then((d) => setLocations(d.locations)).catch((err) => message.error(err.message));
    apiFetch("/api/locations/transfers").then((d) => setTransfers(d.transfers)).catch(() => {});
  }, [message]);
  useEffect(load, [load]);

  async function save() {
    setBusy(true);
    try {
      const d = await apiFetch(edit.id ? `/api/locations/${edit.id}` : "/api/locations", { method: edit.id ? "PATCH" : "POST", body: edit });
      setLocations(d.locations);
      setEdit(null);
      message.success("Location saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function act(id, body, done) {
    try {
      const d = await apiFetch(`/api/locations/${id}`, { method: body ? "PATCH" : "DELETE", ...(body && { body }) });
      setLocations(d.locations);
      message.success(done);
    } catch (err) {
      message.error(err.message);
    }
  }

  const columns = [
    {
      title: "Location",
      render: (_, l) => (
        <div className="text-[13px]">
          <span className="font-medium text-ink">{l.name}</span> {l.isDefault && <Tag className="!ml-1">Default</Tag>} {!l.active && <Tag>Off</Tag>}
          <span className="block text-ink-muted">{[l.address1, l.city, l.province, l.zip].filter(Boolean).join(", ") || "No address"}</span>
        </div>
      ),
    },
    { title: "Ships", dataIndex: "priority", width: 90, render: (p, l) => (l.isDefault && !p ? "First" : `Order ${p}`) },
    { title: "Units in stock", dataIndex: "units", width: 130, align: "right", render: (u) => <span className={u < 0 ? "text-red-600" : ""}>{Number(u).toLocaleString()}</span> },
    {
      title: "",
      width: 260,
      align: "right",
      render: (_, l) => (
        <span className="inline-flex gap-1">
          <Button size="small" onClick={() => setEdit({ ...EMPTY, ...l })}>
            Edit
          </Button>
          {!l.isDefault && l.active && (
            <Button size="small" onClick={() => act(l.id, { isDefault: true }, `${l.name} is now the default`)}>
              Make default
            </Button>
          )}
          {!l.isDefault && (
            <Popconfirm title={`Remove ${l.name}?`} description="Its stock moves to the default location." okText="Remove" okButtonProps={{ danger: true }} onConfirm={() => act(l.id, null, "Location removed")}>
              <Button size="small" type="text" danger>
                Remove
              </Button>
            </Popconfirm>
          )}
        </span>
      ),
    },
  ];

  return (
    <div>
      <SettingsSectionHeader
        title="Locations"
        description="Warehouses and shops you keep stock in. Orders ship from the first location that has everything, in the order below. Set each product's stock by location on its page."
        actions={
          <Button type="primary" icon={<Plus size={14} />} onClick={() => setEdit({ ...EMPTY, priority: locations?.length || 0 })}>
            Add location
          </Button>
        }
      />
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table rowKey="id" size="middle" loading={!locations} columns={columns} dataSource={locations || []} pagination={false} scroll={{ x: 760 }} />
      </Card>
      {locations?.some((l) => l.units < 0) && <p className="mt-2 text-[12px] text-red-600">A location below 0: its stock was lowered elsewhere (Inventory page). Set the right figures on the product's page.</p>}

      {(locations?.length || 0) > 1 && <MoveStock locations={locations} onMoved={load} />}

      {transfers.length > 0 && (
        <Card size="small" title="Stock moves" className="mt-6" styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            dataSource={transfers}
            columns={[
              { title: "Date", dataIndex: "createdAt", width: 150, render: (d) => new Date(d).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) },
              { title: "Product", dataIndex: "item" },
              { title: "From → to", render: (_, t) => `${t.from} → ${t.to}` },
              { title: "Units", dataIndex: "quantity", width: 80, align: "right" },
              { title: "By", dataIndex: "actorName", width: 140, render: (v, t) => [v, t.note].filter(Boolean).join(" · ") || "—" },
            ]}
          />
        </Card>
      )}

      <Modal open={Boolean(edit)} title={edit?.id ? "Edit location" : "Add location"} okText="Save location" okButtonProps={{ loading: busy }} onCancel={() => setEdit(null)} onOk={save}>
        {edit && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-[12px] text-ink-muted">Name</span>
              <Input value={edit.name} maxLength={80} placeholder="e.g. Pune warehouse" onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-[12px] text-ink-muted">Address</span>
              <Input value={edit.address1 || ""} onChange={(e) => setEdit({ ...edit, address1: e.target.value })} />
            </label>
            {[
              ["city", "City"],
              ["province", "State"],
              ["zip", "PIN code"],
              ["phone", "Phone"],
            ].map(([k, l]) => (
              <label key={k}>
                <span className="mb-1 block text-[12px] text-ink-muted">{l}</span>
                <Input value={edit[k] || ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
              </label>
            ))}
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Ships in order (0 first)</span>
              <InputNumber className="!w-full" min={0} max={99} value={edit.priority} onChange={(v) => setEdit({ ...edit, priority: v ?? 0 })} />
            </label>
            {!edit.isDefault && (
              <label className="flex items-center gap-2 pt-5 text-[13px]">
                <Switch size="small" checked={edit.active} onChange={(active) => setEdit({ ...edit, active })} />
                Ships orders
              </label>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/** Move units of one product from one location to another. */
function MoveStock({ locations, onMoved }) {
  const { message } = App.useApp();
  const [form, setForm] = useState({ fromLocationId: locations[0]?.id, toLocationId: locations[1]?.id, variantId: null, quantity: 1, note: "" });
  const [options, setOptions] = useState([]);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  const search = (q) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const d = await apiFetch(`/api/products?q=${encodeURIComponent(q || "")}&pageSize=20`).catch(() => ({}));
      setOptions((d.products || []).flatMap((p) => (p.variants || []).map((v) => ({ value: v.id, label: `${p.title}${v.title && v.title !== "Default" ? ` — ${v.title}` : ""}` }))));
    }, 250);
  };
  async function move() {
    setBusy(true);
    try {
      const r = await apiFetch("/api/locations/transfers", { method: "POST", body: form });
      message.success(`Moved ${r.moved} from ${r.from} to ${r.to}`);
      setForm({ ...form, variantId: null, quantity: 1, note: "" });
      onMoved();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  const locOpts = locations.map((l) => ({ value: l.id, label: l.name }));
  return (
    <Card size="small" title="Move stock between locations" className="mt-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_1fr_100px_auto] md:items-end">
        <label>
          <span className="mb-1 block text-[12px] text-ink-muted">Product</span>
          <Select showSearch filterOption={false} onSearch={search} onFocus={() => !options.length && search("")} value={form.variantId} onChange={(variantId) => setForm({ ...form, variantId })} options={options} placeholder="Search products" className="!w-full" />
        </label>
        <label>
          <span className="mb-1 block text-[12px] text-ink-muted">From</span>
          <Select value={form.fromLocationId} onChange={(fromLocationId) => setForm({ ...form, fromLocationId })} options={locOpts} className="!w-full" />
        </label>
        <label>
          <span className="mb-1 block text-[12px] text-ink-muted">To</span>
          <Select value={form.toLocationId} onChange={(toLocationId) => setForm({ ...form, toLocationId })} options={locOpts} className="!w-full" />
        </label>
        <label>
          <span className="mb-1 block text-[12px] text-ink-muted">Units</span>
          <InputNumber min={1} value={form.quantity} onChange={(quantity) => setForm({ ...form, quantity: quantity || 1 })} className="!w-full" />
        </label>
        <Button type="primary" loading={busy} disabled={!form.variantId} onClick={move}>
          Move stock
        </Button>
      </div>
      <Input className="!mt-3" value={form.note} maxLength={300} placeholder="Note (optional), e.g. Diwali stock for the Pune shop" onChange={(e) => setForm({ ...form, note: e.target.value })} />
    </Card>
  );
}
