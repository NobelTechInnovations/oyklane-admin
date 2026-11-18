"use client";

import { useState } from "react";
import { App, Button, Card, Form, Input, Modal, Popconfirm, Segmented } from "antd";
import { Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

const LEVELS = [
  { value: "none", label: "None" },
  { value: "view", label: "View" },
  { value: "manage", label: "Manage" },
];

/**
 * Settings ▸ Team ▸ Roles: roles that set what a staff member can see or
 * change in each area. Owners and admins aren't limited.
 */
export function StaffRoles({ roles, areas, onSaved }) {
  const { message } = App.useApp();
  const [editing, setEditing] = useState(null); // { id?, name, permissions }
  const [saving, setSaving] = useState(false);

  async function saveAll(next) {
    setSaving(true);
    try {
      const r = await apiFetch("/api/team/roles", { method: "PUT", body: { roles: next } });
      onSaved(r);
      message.success("Roles saved");
      setEditing(null);
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const summary = (r) => {
    const parts = Object.entries(r.permissions || {}).filter(([, v]) => v !== "none");
    return parts.length ? parts.map(([k, v]) => `${areas[k]?.split(",")[0] || k}: ${v}`).join(" · ") : "No access";
  };

  return (
    <Card
      size="small"
      title="Roles"
      extra={
        <Button size="small" icon={<Plus size={13} aria-hidden="true" />} onClick={() => setEditing({ name: "", permissions: Object.fromEntries(Object.keys(areas).map((a) => [a, "none"])) })}>
          Add role
        </Button>
      }
    >
      <p className="m-0 text-[13px] text-ink-muted">Give staff a role to limit what they can see or change, area by area. Staff without a role keep the usual staff access.</p>
      {roles.length > 0 && (
        <ul className="m-0 mt-2 list-none divide-y divide-app-border p-0">
          {roles.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block text-sm font-medium">{r.name}</span>
                <span className="block truncate text-[12px] text-ink-muted">{summary(r)}</span>
              </span>
              <span className="flex shrink-0 gap-1">
                <Button size="small" onClick={() => setEditing(JSON.parse(JSON.stringify(r)))}>
                  Edit
                </Button>
                <Popconfirm title={`Delete "${r.name}"?`} description="People with it go back to the usual staff access." onConfirm={() => saveAll(roles.filter((x) => x.id !== r.id))}>
                  <Button size="small" type="text" danger icon={<Trash2 size={13} aria-hidden="true" />} aria-label={`Delete ${r.name}`} />
                </Popconfirm>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Modal open={Boolean(editing)} title={editing?.id ? "Edit role" : "Add role"} onCancel={() => setEditing(null)} okText="Save role" confirmLoading={saving} onOk={() => saveAll(editing.id ? roles.map((r) => (r.id === editing.id ? editing : r)) : [...roles, editing])} width="min(620px, 100vw)" destroyOnHidden>
        {editing && (
          <Form layout="vertical" requiredMark={false}>
            <Form.Item label="Role name">
              <Input value={editing.name} maxLength={40} placeholder="e.g. Packer, Support, Marketing" onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Form.Item>
            <ul className="m-0 list-none divide-y divide-app-border p-0">
              {Object.entries(areas).map(([key, label]) => (
                <li key={key} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="text-[13px]">{label}</span>
                  <Segmented size="small" value={editing.permissions[key] || "none"} options={LEVELS} onChange={(v) => setEditing({ ...editing, permissions: { ...editing.permissions, [key]: v } })} aria-label={label} />
                </li>
              ))}
            </ul>
            <p className="m-0 mt-2 text-[12px] text-ink-muted">View lets them open it; Manage lets them change it. Refunds and billing stay with owners and admins.</p>
          </Form>
        )}
      </Modal>
    </Card>
  );
}
