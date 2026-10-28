"use client";

import { useEffect, useState } from "react";
import { App, Alert, Button, Card, Form, Input, InputNumber, Select, Skeleton, Table, Tag } from "antd";
import { Banknote, MapPin, PackageCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const day = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—");
const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

/** Settings ▸ Shipping ▸ Oyklane Shipping: built-in couriers for every
 * store — the pickup address, the usual parcel size, and where cash on
 * delivery is paid out. */
export function OyklaneShippingSettings() {
  const { message } = App.useApp();
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(null);
  const [pickupForm] = Form.useForm();
  const [payoutForm] = Form.useForm();

  useEffect(() => {
    apiFetch("/api/shipping/oyklane")
      .then((d) => {
        setData(d);
        pickupForm.setFieldsValue({ ...(d.pickup || {}), ...d.defaults });
        if (d.payout) payoutForm.setFieldsValue({ holder: d.payout.holder, ifsc: d.payout.ifsc, bank: d.payout.bank });
      })
      .catch((err) => setData({ error: err.message }));
  }, [pickupForm, payoutForm]);

  async function save(kind, values) {
    setSaving(kind);
    try {
      const d = await apiFetch(`/api/shipping/oyklane/${kind}`, { method: "PUT", body: values });
      setData(d);
      message.success(kind === "pickup" ? "Pickup address saved" : "Payout account saved");
      if (kind === "payout") payoutForm.setFieldValue("accountNumber", "");
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(null);
    }
  }

  if (!data) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (data.error) return <Alert type="error" showIcon message={data.error} />;

  return (
    <div className="flex flex-col gap-5">
      <Card size="small" styles={{ body: { padding: 18 } }}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5F1FB] text-[#0078d4]">
            <PackageCheck size={20} aria-hidden="true" />
          </span>
          <div>
            <h3 className="m-0 text-[15px] font-semibold text-ink">Oyklane Shipping</h3>
            <p className="m-0 mt-1 text-[13px] text-ink-muted">
              Built in. From any order: compare couriers and prices for the pincode, book in one click, print the label — tracking reaches your customer automatically.
              Freight is billed with your plan. Cash on delivery is collected for you and paid to your bank {data.holdDays} days after delivery.
            </p>
            {!data.ready && <Alert className="!mt-3" type="info" showIcon message="Oyklane Shipping is being switched on — you can save your details now." />}
          </div>
        </div>
      </Card>

      <Card size="small" title={<span className="inline-flex items-center gap-2"><MapPin size={15} aria-hidden="true" /> Pickup address {data.pickupReady && <Tag color="green" className="!ml-1">Ready</Tag>}</span>}>
        <Form form={pickupForm} layout="vertical" requiredMark={false} onFinish={(v) => save("pickup", v)}>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="name" label="Contact name" rules={[{ required: true, message: "Who hands over parcels?" }]}>
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item name="phone" label="Phone" rules={[{ required: true, pattern: /^\D*(\d\D*){10}$/, message: "10-digit mobile number" }]}>
              <Input maxLength={14} placeholder="98765 43210" />
            </Form.Item>
            <Form.Item name="address1" label="Address" rules={[{ required: true, message: "Enter the pickup address" }]} className="sm:col-span-2">
              <Input maxLength={200} placeholder="Shop / warehouse, street" />
            </Form.Item>
            <Form.Item name="address2" label="Area / landmark (optional)" className="sm:col-span-2">
              <Input maxLength={200} />
            </Form.Item>
            <Form.Item name="city" label="City" rules={[{ required: true, message: "City" }]}>
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item name="state" label="State" rules={[{ required: true, message: "State" }]}>
              <Select showSearch options={STATES.map((s) => ({ value: s, label: s }))} />
            </Form.Item>
            <Form.Item name="pincode" label="Pincode" rules={[{ required: true, pattern: /^[1-9]\d{5}$/, message: "6-digit pincode" }]}>
              <Input maxLength={6} inputMode="numeric" />
            </Form.Item>
            <Form.Item name="email" label="Email (optional)" extra="Left empty, we use your store's support email or your sign-in email.">
              <Input maxLength={120} />
            </Form.Item>
          </div>
          <p className="text-[12.5px] font-medium text-ink mb-2 mt-1">Usual parcel (you can change it per order)</p>
          <div className="flex flex-wrap gap-3">
            <Form.Item name="weightGrams" label="Weight (g)" className="!mb-3">
              <InputNumber min={50} max={50000} className="!w-28" />
            </Form.Item>
            <Form.Item name="lengthCm" label="Length (cm)" className="!mb-3">
              <InputNumber min={1} max={200} className="!w-24" />
            </Form.Item>
            <Form.Item name="widthCm" label="Width (cm)" className="!mb-3">
              <InputNumber min={1} max={200} className="!w-24" />
            </Form.Item>
            <Form.Item name="heightCm" label="Height (cm)" className="!mb-3">
              <InputNumber min={1} max={200} className="!w-24" />
            </Form.Item>
          </div>
          <div className="flex justify-end">
            <Button type="primary" htmlType="submit" loading={saving === "pickup"}>
              Save pickup address
            </Button>
          </div>
        </Form>
      </Card>

      {data.pickupReady && <RateChecker />}

      <Card size="small" title={<span className="inline-flex items-center gap-2"><Banknote size={15} aria-hidden="true" /> Cash on delivery payouts</span>}>
        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          <div className="rounded-xl border border-app-border px-4 py-3">
            <p className="m-0 text-[12px] text-ink-muted">Held for you</p>
            <p className="m-0 text-[20px] font-semibold tabular-nums">{inr(data.cod.held)}</p>
            <p className="m-0 text-[12px] text-ink-muted">{data.cod.heldCount} delivered COD order{data.cod.heldCount === 1 ? "" : "s"}, paid out {data.holdDays} days after delivery</p>
          </div>
          <div className="rounded-xl border border-app-border px-4 py-3">
            <p className="m-0 text-[12px] text-ink-muted">Paid to your bank</p>
            <p className="m-0 text-[20px] font-semibold tabular-nums">{inr(data.cod.paid)}</p>
            <p className="m-0 text-[12px] text-ink-muted">{data.payout ? `${data.payout.bank || "Account"} ${data.payout.account}` : "Add your bank account below"}</p>
          </div>
        </div>
        <p className="m-0 mb-4 text-[12.5px] text-ink-muted">
          Courier charges are added to your plan bill. When a COD payout is due, any courier charges not yet billed are taken from it first, and only the rest stays on your bill.
        </p>
        {data.deductions?.length > 0 && (
          <div className="mb-4 rounded-xl border border-app-border px-4 py-3">
            <p className="m-0 mb-1 text-[12px] font-medium text-ink-muted">Courier charges taken from COD payouts</p>
            <ul className="m-0 pl-4 text-[13px]">
              {data.deductions.slice(0, 6).map((d, i) => (
                <li key={i}>
                  {day(d.at)}: COD {inr(d.cod)} − courier charges {inr(d.freight)} = {inr(d.paid)} paid{d.reference ? ` (ref ${d.reference})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.cod.entries.length > 0 && (
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            className="mb-4"
            dataSource={data.cod.entries}
            columns={[
              { title: "Order", dataIndex: "orderNumber", render: (n) => `#${n}` },
              { title: "Amount", dataIndex: "amount", align: "right", render: inr },
              { title: "Delivered", dataIndex: "deliveredAt", render: day },
              { title: "Payout", key: "p", render: (_, r) => (r.status === "paid" ? <Tag color="green">Paid {day(r.paidAt)}</Tag> : <Tag color="blue">On {day(r.releaseOn)}</Tag>) },
            ]}
          />
        )}
        <Form form={payoutForm} layout="vertical" requiredMark={false} onFinish={(v) => save("payout", v)}>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="holder" label="Account holder" rules={[{ required: true, message: "Name on the account" }]}>
              <Input maxLength={120} />
            </Form.Item>
            <Form.Item name="accountNumber" label={data.payout ? `Account number (saved: ${data.payout.account})` : "Account number"} rules={[{ required: true, message: "Account number" }]}>
              <Input.Password maxLength={20} visibilityToggle inputMode="numeric" autoComplete="off" />
            </Form.Item>
            <Form.Item name="ifsc" label="IFSC" rules={[{ required: true, pattern: /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, message: "e.g. HDFC0001234" }]}>
              <Input maxLength={11} style={{ textTransform: "uppercase" }} />
            </Form.Item>
            <Form.Item name="bank" label="Bank (optional)">
              <Input maxLength={80} />
            </Form.Item>
          </div>
          <div className="flex justify-end">
            <Button type="primary" htmlType="submit" loading={saving === "payout"}>
              Save payout account
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}

/** "What would it cost?" — every courier and its price for a pincode. */
function RateChecker() {
  const { message } = App.useApp();
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  async function check(values) {
    setBusy(true);
    try {
      setRows((await apiFetch("/api/shipping/oyklane/rates", { method: "POST", body: values })).couriers);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card size="small" title="Check courier prices">
      <Form layout="inline" onFinish={check} initialValues={{ paymentType: "PREPAID", weightGrams: 500, orderValue: 999 }} className="!gap-y-2">
        <Form.Item name="pincode" rules={[{ required: true, pattern: /^[1-9]\d{5}$/, message: "6-digit pincode" }]}>
          <Input placeholder="Delivery pincode" maxLength={6} inputMode="numeric" className="!w-40" />
        </Form.Item>
        <Form.Item name="weightGrams">
          <InputNumber min={50} max={50000} addonAfter="g" className="!w-32" />
        </Form.Item>
        <Form.Item name="orderValue">
          <InputNumber min={1} addonBefore="₹" className="!w-36" />
        </Form.Item>
        <Form.Item name="paymentType">
          <Select options={[{ value: "PREPAID", label: "Prepaid" }, { value: "COD", label: "Cash on delivery" }]} className="!w-40" />
        </Form.Item>
        <Button htmlType="submit" type="primary" loading={busy}>
          Check
        </Button>
      </Form>
      {rows && (
        <Table
          size="small"
          className="mt-4"
          rowKey="courierId"
          pagination={false}
          dataSource={rows}
          locale={{ emptyText: "No courier serves this pincode right now." }}
          columns={[
            { title: "Courier", dataIndex: "name", render: (v, r, i) => <span>{v}{i === 0 && <Tag color="green" className="!ml-2">Cheapest</Tag>}</span> },
            { title: "Delivery", key: "eta", render: (_, r) => (r.etaDays ? `~${r.etaDays} days` : r.eta || "Standard") },
            { title: "Price", dataIndex: "price", align: "right", render: inr },
          ]}
        />
      )}
    </Card>
  );
}
