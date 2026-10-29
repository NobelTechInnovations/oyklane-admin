"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Table, Tag } from "antd";
import { Boxes, Plus, Star } from "lucide-react";
import { apiFetch } from "@/lib/api";

/** Settings ▸ Shipping ▸ Packages: the boxes you ship in, saved once for
 * every courier. Give a product its package on the product's page; an
 * order's parcel weight and size then fill in by themselves. */
export function PackagesCard() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null); // null | {} (new) | package
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch("/api/shipping/packages")
      .then(setData)
      .catch((err) => message.error(err.message));
  }, [message]);

  function open(pkg) {
    setEditing(pkg || {});
    form.setFieldsValue(pkg || { name: "", weightGrams: 500, lengthCm: 20, widthCm: 15, heightCm: 10 });
  }
  async function save() {
    const v = await form.validateFields();
    setBusy(true);
    try {
      setData(await apiFetch("/api/shipping/packages", { method: "POST", body: { ...v, id: editing?.id } }));
      setEditing(null);
      message.success("Package saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function makeDefault(pkg) {
    try {
      setData(await apiFetch("/api/shipping/packages", { method: "POST", body: { ...pkg, makeDefault: true } }));
    } catch (err) {
      message.error(err.message);
    }
  }
  async function remove(pkg) {
    try {
      setData(await apiFetch(`/api/shipping/packages/${pkg.id}`, { method: "DELETE" }));
    } catch (err) {
      message.error(err.message);
    }
  }

  return (
    <Card
      size="small"
      title={<span className="inline-flex items-center gap-2"><Boxes size={15} aria-hidden="true" /> Packages</span>}
      extra={
        <Button size="small" icon={<Plus size={13} aria-hidden="true" />} onClick={() => open(null)}>
          Add package
        </Button>
      }
      styles={{ body: { padding: 0 } }}
    >
      <p className="m-0 px-4 pt-3 pb-2 text-[13px] text-ink-muted">
        The boxes you ship in, with their packed weight. Choose a product&apos;s package on its page; products without one use the default. Used by Oyklane Shipping and Shiprocket.
      </p>
      <Table
        rowKey="id"
        size="small"
        dataSource={data?.packages || []}
        loading={!data}
        pagination={false}
        locale={{ emptyText: "No packages yet — add your usual box." }}
        columns={[
          { title: "Name", dataIndex: "name", render: (v, r) => <span className="font-medium">{v}{r.id === data?.defaultId && <Tag color="blue" className="!ml-2">Default</Tag>}</span> },
          { title: "Size (cm)", render: (_, r) => `${r.lengthCm} × ${r.widthCm} × ${r.heightCm}` },
          { title: "Weight", dataIndex: "weightGrams", render: (g) => (g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g} g`) },
          {
            title: "",
            align: "right",
            render: (_, r) => (
              <span className="inline-flex gap-1">
                {r.id !== data?.defaultId && <Button size="small" type="text" icon={<Star size={13} aria-hidden="true" />} onClick={() => makeDefault(r)}>Make default</Button>}
                <Button size="small" onClick={() => open(r)}>Edit</Button>
                <Popconfirm title="Delete this package? Products using it go back to the default." onConfirm={() => remove(r)}>
                  <Button size="small" danger type="text">Delete</Button>
                </Popconfirm>
              </span>
            ),
          },
        ]}
      />
      <Modal open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={save} confirmLoading={busy} okText="Save" title={editing?.id ? "Edit package" : "Add package"} destroyOnHidden>
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Like “Small box”" }]}>
            <Input maxLength={60} placeholder="Small box" />
          </Form.Item>
          <div className="grid grid-cols-3 gap-x-3">
            <Form.Item name="lengthCm" label="Length (cm)" rules={[{ required: true, message: "Length" }]}>
              <InputNumber min={1} max={200} className="!w-full" />
            </Form.Item>
            <Form.Item name="widthCm" label="Width (cm)" rules={[{ required: true, message: "Width" }]}>
              <InputNumber min={1} max={200} className="!w-full" />
            </Form.Item>
            <Form.Item name="heightCm" label="Height (cm)" rules={[{ required: true, message: "Height" }]}>
              <InputNumber min={1} max={200} className="!w-full" />
            </Form.Item>
          </div>
          <Form.Item name="weightGrams" label="Packed weight (g)" extra="The box with one product in it, ready to ship." rules={[{ required: true, message: "Weight" }]}>
            <InputNumber min={10} max={50000} className="!w-40" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
