"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { App, Button, Card, Checkbox, Empty, Form, Input, InputNumber, Modal, Radio, Select, Skeleton, Switch, Table, Tag } from "antd";
import { Gift, Plus, ExternalLink, Copy } from "lucide-react";
import { PageHeader, useConfirmDialog } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { storefrontUrlFor } from "@/lib/storefront";
import { AppNotInstalled } from "@/components/apps/AppPanelParts";
import { ImageUploadField } from "@/components/ImageUploadField";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function BundleModal({ open, bundle, onClose, onSaved }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  // Product id → the options ticked for the box (missing: all of them).
  const [picked, setPicked] = useState({});
  const v = Form.useWatch([], form) || {};

  useEffect(() => {
    if (!open) return;
    apiFetch("/api/products?pageSize=100").then((d) => setProducts(d.products || [])).catch(() => {});
    apiFetch("/api/collections?pageSize=100").then((d) => setCollections(d.collections || [])).catch(() => {});
    form.resetFields();
    form.setFieldsValue(bundle ? { ...bundle, endsAt: bundle.endsAt ? String(bundle.endsAt).slice(0, 10) : "" } : { size: 5, price: 549, appliesTo: "products", targetIds: [], active: true, split: true, title: "Buy any 5 for ₹549" });
    setPicked({});
  }, [open, bundle, form]);
  // An existing bundle's ticked options, once the products have loaded.
  useEffect(() => {
    if (!open || !bundle?.variantIds?.length || !products.length) return;
    const only = new Set(bundle.variantIds);
    const next = {};
    for (const p of products) if (bundle.targetIds.includes(p.id) && (p.variants || []).length > 1) next[p.id] = p.variants.filter((x) => only.has(x.id)).map((x) => x.id);
    setPicked(next);
  }, [open, bundle, products]);

  const chosen = v.appliesTo === "products" ? products.filter((p) => (v.targetIds || []).includes(p.id)) : [];
  const withOptions = chosen.filter((p) => (p.variants || []).length > 1);
  const ticked = (p) => picked[p.id] ?? p.variants.map((x) => x.id);

  async function save(values) {
    setSaving(true);
    try {
      const empty = withOptions.find((p) => !ticked(p).length);
      if (empty) throw new Error(`Tick at least one option of ${empty.title}`);
      // Every option ticked everywhere: no limit (new options join by themselves).
      const limited = withOptions.some((p) => ticked(p).length < p.variants.length);
      const variantIds = limited ? chosen.flatMap((p) => ((p.variants || []).length > 1 ? ticked(p) : (p.variants || []).map((x) => x.id))) : [];
      const body = { ...values, variantIds, split: values.split !== false, endsAt: values.endsAt ? new Date(`${values.endsAt}T23:59:59+05:30`).toISOString() : null };
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
        {withOptions.length > 0 && (
          <Form.Item label="Which options can go in the box" extra="Untick what shouldn't be in this bundle — say, keep only the 100 g packs. A sold-out option shows greyed out on the bundle page until it's back in stock.">
            <div className="flex max-h-64 flex-col gap-3 overflow-auto rounded-[10px] border border-app-border p-3">
              {withOptions.map((p) => (
                <div key={p.id}>
                  <div className="mb-1 text-[13px] font-medium text-ink">{p.title}</div>
                  <Checkbox.Group
                    value={ticked(p)}
                    onChange={(vals) => setPicked((m) => ({ ...m, [p.id]: vals }))}
                    options={p.variants.map((x) => ({ value: x.id, label: `${x.title} · ${inr(x.price)}${Number(x.inventoryQuantity) <= 0 ? " · sold out" : ""}` }))}
                  />
                </div>
              ))}
            </div>
          </Form.Item>
        )}
        {withOptions.length > 0 && (
          <Form.Item name="split" valuePropName="checked" className="-mt-2">
            <Checkbox>Show each ticked option as its own item on the bundle page</Checkbox>
          </Form.Item>
        )}
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
  const [store, setStore] = useState(null);
  useEffect(() => {
    apiFetch("/api/store")
      .then((r) => setStore(r.store))
      .catch(() => {});
  }, []);
  const pageUrl = (code) => (store ? `${storefrontUrlFor(store)}/bundles/${code}` : "");

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
                title: "Page",
                render: (_, r) =>
                  store && (
                    <span className="inline-flex gap-1 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <Button size="small" icon={<ExternalLink size={13} aria-hidden="true" />} href={pageUrl(r.code)} target="_blank" rel="noopener noreferrer">
                        View
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        icon={<Copy size={13} aria-hidden="true" />}
                        aria-label="Copy page link"
                        onClick={() => navigator.clipboard?.writeText(pageUrl(r.code)).then(() => message.success("Link copied"))}
                      />
                    </span>
                  ),
              },
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
        <Card size="small" title="How shoppers buy a bundle">
          <p className="m-0 text-[13px] text-ink-muted">
            Every bundle has its own page. Shoppers pick the items, and once the box is full they buy it in one click at the bundle price. The box is checked out on its own — nothing else in their cart is ordered with it, and their cart is waiting for them after.
          </p>
          <p className="mb-0 mt-2 text-[13px] text-ink-muted">
            Link to it from your menu (Content ▸ Navigation), a banner or a WhatsApp message.{store && <> All bundles: <a href={`${storefrontUrlFor(store)}/bundles`} target="_blank" rel="noopener noreferrer">/bundles</a></>}
          </p>
          <Link href="/admin/content/navigation">
            <Button size="small" className="mt-3">Add to menu</Button>
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
