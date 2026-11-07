"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Alert, App, Button, Card, Form, Input, InputNumber, Modal, Select, Skeleton, Switch, Table, Tag } from "antd";
import { CheckCircle2, MapPin, PackageX, Plus, Truck, Wallet } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";

const HELP = {
  shiprocket: "In Shiprocket go to Settings ▸ API ▸ Configure, create an API user (a different email from your Shiprocket login) and enter it here.",
  "ithink-logistics": "In your iThink Logistics panel open Settings ▸ API to copy your access token and secret key.",
};

/** Shiprocket / iThink Logistics: link the seller's own account, pick the
 * pickup address and usual parcel size. Shipping happens from an order. */
export default function CourierAppPage() {
  const { app } = useParams();
  const { message, modal } = App.useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [connectForm] = Form.useForm();
  const [defaultsForm] = Form.useForm();

  const load = useCallback(async () => {
    try {
      const d = await apiFetch(`/api/courier-apps/${app}`);
      setData(d);
      defaultsForm.setFieldsValue({ pickupId: d.pickupId, autoSync: d.autoSync, ...d.defaults });
    } catch (err) {
      setError(err.message);
    }
  }, [app, defaultsForm]);
  useEffect(() => {
    load();
  }, [load]);

  async function connect(values) {
    setBusy("connect");
    try {
      const d = await apiFetch(`/api/courier-apps/${app}/connect`, { method: "POST", body: values });
      setData(d);
      defaultsForm.setFieldsValue({ pickupId: d.pickupId, ...d.defaults });
      connectForm.resetFields();
      message.success(`${d.name} connected`);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  function disconnect() {
    modal.confirm({
      title: `Disconnect ${data.name}?`,
      content: "Parcels already booked keep their tracking until you connect again.",
      okText: "Disconnect",
      okButtonProps: { danger: true },
      onOk: async () => {
        setData(await apiFetch(`/api/courier-apps/${app}/disconnect`, { method: "POST" }));
      },
    });
  }

  async function saveDefaults(values) {
    setBusy("defaults");
    try {
      setData(await apiFetch(`/api/courier-apps/${app}/defaults`, { method: "PUT", body: values }));
      message.success("Saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  if (error) return <Alert type="error" showIcon message={error} />;
  if (!data) return <Skeleton active paragraph={{ rows: 6 }} />;
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <PageHeader title={data.name} subtitle={`Ship orders with your own ${data.name} account. ${data.name} bills you directly for shipping.`} />
      <Card
        size="small"
        title="Your account"
        extra={data.connected ? <Tag color="green" icon={<CheckCircle2 size={12} className="mr-1 inline" aria-hidden="true" />}>Connected</Tag> : <Tag>Not connected</Tag>}
        styles={{ body: { padding: 20 } }}
      >
        {data.connected ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm text-ink">
              {data.account || "Connected"}
              {data.connectedAt ? <span className="text-ink-muted"> · since {new Date(data.connectedAt).toLocaleDateString("en-IN")}</span> : null}
            </p>
            <Button danger onClick={disconnect}>
              Disconnect
            </Button>
          </div>
        ) : (
          <Form form={connectForm} layout="vertical" onFinish={connect} requiredMark={false}>
            <p className="m-0 mb-4 text-[13px] text-ink-muted">{HELP[app]}</p>
            <div className="grid gap-x-4 sm:grid-cols-2">
              {data.fields.map((f) => (
                <Form.Item key={f.id} name={f.id} label={f.label} rules={[{ required: true, message: `Enter the ${f.label.toLowerCase()}` }]}>
                  {f.type === "password" ? <Input.Password autoComplete="off" /> : <Input autoComplete="off" type={f.type === "email" ? "email" : "text"} />}
                </Form.Item>
              ))}
            </div>
            <Button type="primary" htmlType="submit" loading={busy === "connect"}>
              Connect {data.name}
            </Button>
          </Form>
        )}
        {data.error && <Alert type="warning" showIcon className="!mt-4" message={data.error} />}
      </Card>

      {data.connected && (
        <Card size="small" title={<span className="inline-flex items-center gap-2"><Truck size={15} aria-hidden="true" /> Pickup and parcel</span>} styles={{ body: { padding: 20 } }}>
          <Form form={defaultsForm} layout="vertical" onFinish={saveDefaults} requiredMark={false}>
            <Form.Item name="autoSync" valuePropName="checked" label={`Send new orders to ${data.name} automatically`} extra={`Each new order (online orders once paid) appears in your ${data.name} panel straight away. Choose the courier there, or from the order here (Fulfillment ▸ Ship with ${data.name}).`}>
              <Switch />
            </Form.Item>
            <Form.Item name="pickupId" label="Pickup address" extra={`Pickup addresses come from your ${data.name} account — add more there.`}>
              <Select options={data.pickups.map((p) => ({ value: p.id, label: `${p.name} — ${p.address} ${p.pincode}` }))} placeholder={data.pickups.length ? "Choose" : `No pickup address in ${data.name} yet`} />
            </Form.Item>
            <p className="m-0 mb-2 text-[13px] font-medium text-ink">Usual parcel (you can change it per order)</p>
            <div className="flex flex-wrap gap-3">
              <Form.Item name="weightGrams" label="Weight (g)">
                <InputNumber min={50} max={50000} className="!w-32" />
              </Form.Item>
              <Form.Item name="lengthCm" label="Length (cm)">
                <InputNumber min={1} max={200} className="!w-24" />
              </Form.Item>
              <Form.Item name="widthCm" label="Width (cm)">
                <InputNumber min={1} max={200} className="!w-24" />
              </Form.Item>
              <Form.Item name="heightCm" label="Height (cm)">
                <InputNumber min={1} max={200} className="!w-24" />
              </Form.Item>
            </div>
            <Button type="primary" htmlType="submit" loading={busy === "defaults"}>
              Save
            </Button>
          </Form>
          <p className="m-0 mt-4 text-[12.5px] text-ink-muted">To ship, open an order and choose Fulfillment ▸ Ship with {data.name}. Parcel weight and size come from your products&apos; packages (Settings ▸ Shipping) when they have one.</p>
        </Card>
      )}

      {data.connected && app === "shiprocket" && <ShiprocketExtras app={app} name={data.name} onPickupAdded={load} />}
    </div>
  );
}

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** Shiprocket only: wallet balance, a new pickup address, and parcels the
 * courier couldn't deliver (re-attempt or return). */
function ShiprocketExtras({ app, name, onPickupAdded }) {
  const { message } = App.useApp();
  const [wallet, setWallet] = useState(null);
  const [ndr, setNdr] = useState(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(null);
  const [form] = Form.useForm();

  const loadNdr = useCallback(() => apiFetch(`/api/courier-apps/${app}/ndr`).then((d) => setNdr(d.ndr)).catch((err) => setNdr({ error: err.message })), [app]);
  useEffect(() => {
    apiFetch(`/api/courier-apps/${app}/wallet`).then(setWallet).catch(() => setWallet({ error: true }));
    loadNdr();
  }, [app, loadNdr]);

  async function addPickup(values) {
    setBusy("pickup");
    try {
      await apiFetch(`/api/courier-apps/${app}/pickups`, { method: "POST", body: values });
      message.success("Pickup address added — Shiprocket verifies new addresses before the first pickup");
      setAdding(false);
      form.resetFields();
      onPickupAdded?.();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }
  async function act(row, action) {
    setBusy(`${row.awb}:${action}`);
    try {
      await apiFetch(`/api/courier-apps/${app}/ndr/${encodeURIComponent(row.awb)}`, { method: "POST", body: { action } });
      message.success(action === "return" ? "Sent back to you (RTO)" : "The courier will try again");
      loadNdr();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Card size="small" styles={{ body: { padding: 20 } }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1F5FD6]">
              <Wallet size={18} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[12.5px] text-ink-muted">{name} wallet</span>
              <span className={`block text-[20px] font-semibold tabular-nums ${wallet?.balance < 0 ? "text-[#B91C1C]" : "text-ink"}`}>{wallet ? (wallet.error ? "—" : inr(wallet.balance)) : "…"}</span>
            </span>
          </span>
          <span className="flex flex-wrap gap-2">
            <Button icon={<Plus size={14} aria-hidden="true" />} onClick={() => setAdding(true)}>
              Add pickup address
            </Button>
            <Button href="https://app.shiprocket.in/recharge" target="_blank" rel="noopener noreferrer">
              Recharge in {name}
            </Button>
          </span>
        </div>
        {wallet?.balance < 0 && <p className="m-0 mt-3 text-[12.5px] text-[#B45309]">Your {name} wallet is below zero — {name} may hold new bookings until you recharge.</p>}
      </Card>

      <Card size="small" title={<span className="inline-flex items-center gap-2"><PackageX size={15} aria-hidden="true" /> Delivery failed — needs your decision</span>} styles={{ body: { padding: 0 } }}>
        {ndr?.error ? (
          <p className="m-0 p-4 text-[13px] text-ink-muted">{ndr.error}</p>
        ) : (
          <Table
            size="small"
            rowKey="awb"
            loading={!ndr}
            dataSource={Array.isArray(ndr) ? ndr : []}
            pagination={false}
            locale={{ emptyText: "No failed deliveries. When a courier can't deliver, it shows here." }}
            scroll={{ x: "max-content" }}
            columns={[
              { title: "AWB", dataIndex: "awb", render: (v, r) => <span className="tabular-nums">{v}<span className="block text-[12px] text-ink-muted">{r.courier}</span></span> },
              { title: "Customer", key: "c", render: (_, r) => <span>{r.customer}<span className="block text-[12px] text-ink-muted">{[r.city, r.phone].filter(Boolean).join(" · ")}</span></span> },
              { title: "Reason", dataIndex: "reason", render: (v, r) => <span className="text-[13px]">{v || "—"}{r.attempts ? <span className="block text-[12px] text-ink-muted">{r.attempts} attempt(s)</span> : null}</span> },
              {
                title: "",
                key: "a",
                align: "right",
                render: (_, r) => (
                  <span className="flex justify-end gap-1.5">
                    <Button size="small" type="primary" loading={busy === `${r.awb}:re-attempt`} onClick={() => act(r, "re-attempt")}>
                      Deliver again
                    </Button>
                    <Button size="small" danger loading={busy === `${r.awb}:return`} onClick={() => act(r, "return")}>
                      Return to me
                    </Button>
                  </span>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal open={adding} onCancel={() => setAdding(false)} title={<span className="inline-flex items-center gap-2"><MapPin size={16} aria-hidden="true" /> Add a pickup address in {name}</span>} footer={null} destroyOnHidden width={560}>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={addPickup}>
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Form.Item name="label" label="Name for it" rules={[{ required: true, message: "e.g. Jaipur warehouse" }]} className="sm:col-span-2" extra="Letters and numbers only — Shiprocket shows it as the pickup name.">
              <Input maxLength={36} placeholder="Jaipur warehouse" />
            </Form.Item>
            <Form.Item name="name" label="Contact name" rules={[{ required: true }]}>
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item name="phone" label="Phone" rules={[{ required: true, pattern: /^\D*(\d\D*){10}$/, message: "10-digit mobile number" }]}>
              <Input maxLength={14} />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]} className="sm:col-span-2">
              <Input maxLength={120} />
            </Form.Item>
            <Form.Item name="address1" label="Address" rules={[{ required: true, min: 10, message: "Full address with house or shop number" }]} className="sm:col-span-2">
              <Input maxLength={200} placeholder="Shop 12, MI Road" />
            </Form.Item>
            <Form.Item name="address2" label="Area / landmark (optional)" className="sm:col-span-2">
              <Input maxLength={200} />
            </Form.Item>
            <Form.Item name="city" label="City" rules={[{ required: true }]}>
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item name="state" label="State" rules={[{ required: true }]}>
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item name="pincode" label="Pincode" rules={[{ required: true, pattern: /^[1-9]\d{5}$/, message: "6-digit pincode" }]}>
              <Input maxLength={6} inputMode="numeric" />
            </Form.Item>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={busy === "pickup"}>
              Add address
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}
