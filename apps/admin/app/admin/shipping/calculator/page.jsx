"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, App, Button, Card, Form, Input, InputNumber, Segmented, Table, Tag } from "antd";
import { Calculator } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const kg = (g) => `${(Number(g || 0) / 1000).toFixed(2)} kg`;

/**
 * Shipping ▸ Rate calculator: what each courier charges between two
 * pincodes for a parcel — a delivery (prepaid or cash on delivery) or a
 * return — before booking anything. Prices are what you pay, before GST.
 */
export default function RateCalculatorPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const direction = Form.useWatch("direction", form);

  async function check(values) {
    setBusy(true);
    setError(null);
    try {
      setResult(await apiFetch("/api/shipping/oyklane/rates", { method: "POST", body: values }));
    } catch (err) {
      setError(err);
      if (!err.details?.reason) message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const reason = error?.details?.reason;
  return (
    <div>
      <PageHeader title="Rate calculator" subtitle="What each courier charges for a parcel between two pincodes — before you book. Prices are before GST." actions={<Link href="/admin/shipping/rates"><Button>Rate chart</Button></Link>} />
      {(reason === "no_pickup" || reason === "pickup_pending") && (
        <Alert type="info" showIcon className="!mb-4" message={error.message} action={reason === "no_pickup" ? <Link href="/admin/settings/shipping">Add pickup address</Link> : null} />
      )}
      <Card className="!mb-5">
        <Form form={form} layout="vertical" requiredMark={false} onFinish={check} initialValues={{ direction: "forward", paymentType: "PREPAID", weightGrams: 500, lengthCm: 20, widthCm: 15, heightCm: 10, orderValue: 999 }}>
          <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-4">
            <Form.Item name="direction" label="Shipment" className="lg:col-span-2">
              <Segmented block options={[{ value: "forward", label: "Delivery to customer" }, { value: "return", label: "Return to you" }]} />
            </Form.Item>
            <Form.Item name="paymentType" label="Payment" className="lg:col-span-2">
              <Segmented block disabled={direction === "return"} options={[{ value: "PREPAID", label: "Prepaid" }, { value: "COD", label: "Cash on delivery" }]} />
            </Form.Item>
            <Form.Item name="fromPincode" label="Pickup pincode" extra="Empty: your pickup address" rules={[{ pattern: /^[1-9]\d{5}$/, message: "6-digit pincode" }]}>
              <Input maxLength={6} inputMode="numeric" placeholder="Your pickup" />
            </Form.Item>
            <Form.Item name="pincode" label="Delivery pincode" rules={[{ required: true, pattern: /^[1-9]\d{5}$/, message: "6-digit pincode" }]}>
              <Input maxLength={6} inputMode="numeric" placeholder="e.g. 400001" />
            </Form.Item>
            <Form.Item name="weightGrams" label="Weight">
              <InputNumber min={50} max={50000} addonAfter="g" className="!w-full" />
            </Form.Item>
            <Form.Item name="orderValue" label="Order value">
              <InputNumber min={1} addonBefore="₹" className="!w-full" />
            </Form.Item>
            <Form.Item name="lengthCm" label="Length">
              <InputNumber min={1} max={200} addonAfter="cm" className="!w-full" />
            </Form.Item>
            <Form.Item name="widthCm" label="Width">
              <InputNumber min={1} max={200} addonAfter="cm" className="!w-full" />
            </Form.Item>
            <Form.Item name="heightCm" label="Height">
              <InputNumber min={1} max={200} addonAfter="cm" className="!w-full" />
            </Form.Item>
            <Form.Item label=" ">
              <Button type="primary" htmlType="submit" loading={busy} icon={<Calculator size={15} aria-hidden="true" />} block>
                Calculate
              </Button>
            </Form.Item>
          </div>
        </Form>
      </Card>
      {result && (
        <Card
          size="small"
          title={`${result.from} → ${result.to}`}
          extra={
            <span className="text-[12.5px] text-ink-muted">
              Charged on {kg(result.parcel.chargedGrams)}
              {result.parcel.volumetricGrams > result.parcel.weightGrams ? ` (box size: ${kg(result.parcel.volumetricGrams)} is more than the weight)` : ""}
            </span>
          }
          styles={{ body: { padding: 0 } }}
        >
          <Table
            rowKey="courierId"
            size="small"
            pagination={false}
            dataSource={result.couriers}
            locale={{ emptyText: "No courier serves this route right now." }}
            columns={[
              { title: "Courier", dataIndex: "name", render: (v, r, i) => <span className="font-medium">{v}{i === 0 && <Tag color="green" className="!ml-2">Cheapest</Tag>}</span> },
              { title: "Zone", dataIndex: "zone", render: (z) => z || "—" },
              { title: "Delivers in", key: "eta", render: (_, r) => (r.etaDays ? `~${r.etaDays} day${Number(r.etaDays) === 1 ? "" : "s"}` : r.eta || "—") },
              { title: "Price", dataIndex: "price", align: "right", render: (v) => <b className="tabular-nums">{inr(v)}</b> },
            ]}
          />
        </Card>
      )}
    </div>
  );
}
