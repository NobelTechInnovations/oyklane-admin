"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { App, Button, Card, Empty, Form, Input, InputNumber, Modal, Radio, Select, Skeleton, Switch, Table, Tag } from "antd";
import { Gift, Plus, Paintbrush } from "lucide-react";
import { PageHeader, useConfirmDialog } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { AppNotInstalled } from "@/components/apps/AppPanelParts";
import { ImageUploadField } from "@/components/ImageUploadField";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function BundleModal({ open, bundle, onClose, onSaved }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const v = Form.useWatch([], form) || {};

  useEffect(() => {
    if (!open) return;
    apiFetch("/api/products?pageSize=100").then((d) => setProducts(d.products || [])).catch(() => {});
    apiFetch("/api/collections?pageSize=100").then((d) => setCollections(d.collections || [])).catch(() => {});
    form.resetFields();
    form.setFieldsValue(bundle ? { ...bundle, endsAt: bundle.endsAt ? String(bundle.endsAt).slice(0, 10) : "" } : { size: 5, price: 549, appliesTo: "products", targetIds: [], active: true, title: "Buy any 5 for ₹549" });
  }, [open, bundle, form]);

  async function save(values) {
    setSaving(true);
    try {
      const body = { ...values, endsAt: values.endsAt ? new Date(`${values.endsAt}T23:59:59+05:30`).toISOString() : null };
      await apiFetch(bundle ? `/api/bundles/${bundle.id}` : "/api/bundles", { method: bundle ? "PATCH" : "POST", body });
      message.success("Bundle saved");
      onSaved();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const options = v.appliesTo === "collections" ? collections.map((c) => ({ value: c.id, label: c.title })) : products.map((p) => ({ value: p.id, label: p.title, image: p.images?.[0]?.url }));
  return (
    <Modal open={open} onCancel={onClose} title={bundle ? "Edit bundle" : "New bundle"} okText="Save bundle" confirmLoading={saving} onOk={() => form.submit()} width={640} destroyOnHidden>
      <Form form={form} layout="vertical" requiredMark={false} onFinish={save}>
        <Form.Item name="title" label="Name shoppers see" rules={[{ required: true, message: "Name it" }]}>
          <Input maxLength={80} />
        </Form.Item>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="size" label="Items in the box" rules={[{ required: true }]}>
            <InputNumber min={2} max={20} className="w-full" />
          </Form.Item>
          <Form.Item name="price" label="Box price (₹)" rules={[{ required: true }]}>
            <InputNumber min={1} className="w-full" />
          </Form.Item>
        </div>
        <Form.Item name="appliesTo" label="What can go in the box">
          <Radio.Group optionType="button" onChange={() => form.setFieldValue("targetIds", [])} options={[{ value: "products", label: "Products I choose" }, { value: "collections", label: "Products in collections" }]} />
        </Form.Item>
        <Form.Item name="targetIds" rules={[{ required: true, message: "Choose at least one" }]}>
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            placeholder={v.appliesTo === "collections" ? "Choose collections" : "Choose products"}
            options={options}
            optionRender={(o) => (
              <span className="flex items-center gap-2">
                {o.data.image && <img src={o.data.image} alt="" className="h-7 w-7 rounded object-cover" />}
                <span className="truncate">{o.data.label}</span>
              </span>
            )}
          />
        </Form.Item>
        <Form.Item name="description" label="Line under the heading (optional)">
          <Input.TextArea rows={2} maxLength={400} />
        </Form.Item>
        <Form.Item name="image" label="Banner (optional)">
          <ImageUploadField hint="Wide, 1600 × 500 px works well." />
        </Form.Item>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="endsAt" label="Ends (optional)">
            <Input type="date" />
          </Form.Item>
          <Form.Item name="active" label="On" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}

/** Apps ▸ Bundles: "any N for ₹X" boxes. */
export default function BundlesPage() {
  const { message } = App.useApp();
  const { confirmDialog } = useConfirmDialog();
  const [rows, setRows] = useState(null);
  const [missing, setMissing] = useState(false);
  const [modal, setModal] = useState({ open: false, bundle: null });

  const load = useCallback(async () => {
    try {
      setRows((await apiFetch("/api/bundles")).bundles);
    } catch (err) {
      if (err.status === 402) setMissing(true);
      else message.error(err.message);
    }
  }, [message]);
  useEffect(() => {
    load();
  }, [load]);

  if (missing) return <AppNotInstalled appKey="bundles" title="Bundles" description="“Buy any 5 for ₹549” boxes." />;
  if (!rows) return <Skeleton active />;
  return (
    <div>
      <PageHeader
        title="Bundles"
        backHref="/admin/apps"
        actions={
          <Button type="primary" icon={<Plus size={14} aria-hidden="true" />} onClick={() => setModal({ open: true, bundle: null })}>
            New bundle
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <Card styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            dataSource={rows}
            pagination={false}
            onRow={(r) => ({ onClick: () => setModal({ open: true, bundle: r }), className: "cursor-pointer" })}
            locale={{ emptyText: <Empty image={<Gift size={36} className="mx-auto text-ink-subtle" />} description="No bundles yet. Make one like “Buy any 5 for ₹549”." /> }}
            columns={[
              { title: "Bundle", render: (_, r) => <span className="font-medium">{r.title}<span className="block text-xs text-ink-muted font-normal">Code {r.code}</span></span> },
              { title: "Box", render: (_, r) => `${r.size} items for ${inr(r.price)}` },
              { title: "From", render: (_, r) => `${r.targetIds.length} ${r.appliesTo === "collections" ? "collection" : "product"}${r.targetIds.length === 1 ? "" : "s"}` },
              { title: "Used", dataIndex: "used" },
              { title: "", render: (_, r) => (r.active ? <Tag color="green">On</Tag> : <Tag>Off</Tag>) },
              {
                title: "",
                align: "right",
                render: (_, r) => (
                  <Button
                    size="small"
                    type="text"
                    danger
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!(await confirmDialog({ title: `Delete "${r.title}"?`, okText: "Delete", danger: true }))) return;
                      await apiFetch(`/api/bundles/${r.id}`, { method: "DELETE" }).catch((err) => message.error(err.message));
                      load();
                    }}
                  >
                    Delete
                  </Button>
                ),
              },
            ]}
          />
        </Card>
        <Card size="small" title="Put the box builder on your store">
          <p className="m-0 text-[13px] text-ink-muted">
            Online Store ▸ Customize ▸ <b>Add section</b> ▸ Apps ▸ <b>Bundle builder</b> — on the home page or any page. Paste a bundle&apos;s code in its settings to show that one. The bundle price also applies in the cart when shoppers add the items any other way.
          </p>
          <Link href="/admin/online-store/themes">
            <Button size="small" className="mt-3" icon={<Paintbrush size={13} aria-hidden="true" />}>Open Customize</Button>
          </Link>
        </Card>
      </div>
      <BundleModal
        open={modal.open}
        bundle={modal.bundle}
        onClose={() => setModal({ open: false, bundle: null })}
        onSaved={() => {
          setModal({ open: false, bundle: null });
          load();
        }}
      />
    </div>
  );
}
