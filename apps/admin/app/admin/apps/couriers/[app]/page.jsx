"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Alert, App, Button, Card, Form, Input, InputNumber, Select, Skeleton, Tag } from "antd";
import { CheckCircle2, Truck } from "lucide-react";
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
      defaultsForm.setFieldsValue({ pickupId: d.pickupId, ...d.defaults });
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
          <p className="m-0 mt-4 text-[12.5px] text-ink-muted">To ship, open an order and choose “Ship with {data.name}”.</p>
        </Card>
      )}
    </div>
  );
}
