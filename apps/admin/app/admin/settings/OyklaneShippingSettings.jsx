"use client";

import { useEffect, useState } from "react";
import { App, Alert, Button, Card, Dropdown, Form, Input, InputNumber, Modal, Segmented, Select, Skeleton, Switch, Table, Tabs, Tag } from "antd";
import { Banknote, MapPin, MoreHorizontal, PackageCheck, Plus, Star, Trash2, Wallet, Zap } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { payuReturn } from "@/lib/billing";
import { AddMoneyDialog, ShippingWalletPanel } from "@/components/shipping/ShippingWallet";
import { PackagesCard } from "./PackagesCard";
import { useUrlState } from "@/lib/useUrlState";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const day = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—");
const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];
const TAB_KEYS = ["couriers", "pickups", "wallet", "parcels", "cod", "checkout"];

function useTab() {
  return useUrlState("tab", "couriers", TAB_KEYS);
}

const PickupTag = ({ status }) => (status === "approved" ? <Tag color="green" className="!m-0">Approved</Tag> : status ? <Tag color="gold" className="!m-0">Waiting for approval</Tag> : null);

/** Settings ▸ Shipping: Oyklane Shipping (couriers, pickup addresses,
 * wallet, parcels, COD payouts) and what shoppers pay at checkout — one
 * tab each, so nothing is a long scroll. */
export function OyklaneShippingSettings({ checkout }) {
  const { message } = App.useApp();
  const [data, setData] = useState(null);
  const [tab, setTab] = useTab();
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    apiFetch("/api/shipping/oyklane")
      .then(setData)
      .catch((err) => setData({ error: err.message }));
    const back = payuReturn();
    if (back) {
      setTab("wallet");
      if (back.status === "success") message.success("Money added to your shipping wallet");
      else if (back.status === "pending") message.info("Your payment is being confirmed — the money shows here within a few minutes.");
      else message.error(back.reason || "The payment didn't go through. No money was added.");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (data.error) return <Alert type="error" showIcon message={data.error} />;
  const wallet = data.wallet?.enabled ? data.wallet : null;
  const setBalance = (balance) => setData((d) => ({ ...d, wallet: { ...d.wallet, balance } }));

  const items = [
    { key: "couriers", label: "Overview", children: <Overview data={data} onSaved={setData} goTo={setTab} onAddMoney={() => setAdding(true)} /> },
    { key: "pickups", label: `Pickup addresses${data.pickups?.length ? ` (${data.pickups.length})` : ""}`, children: <Pickups data={data} onSaved={setData} /> },
    ...(wallet ? [{ key: "wallet", label: "Wallet", children: <ShippingWalletPanel onBalance={setBalance} /> }] : []),
    { key: "parcels", label: "Parcels", children: <Parcels data={data} onSaved={setData} /> },
    { key: "cod", label: "COD payouts", children: <CodPayouts data={data} onSaved={setData} /> },
    ...(checkout ? [{ key: "checkout", label: "Checkout rates", children: checkout }] : []),
  ];

  return (
    <>
      <Tabs activeKey={items.some((i) => i.key === tab) ? tab : "couriers"} onChange={setTab} items={items} className="oy-settings-tabs" />
      {wallet && <AddMoneyDialog open={adding} onClose={() => setAdding(false)} minTopup={wallet.minTopup} onAdded={setBalance} />}
    </>
  );
}

/** What's set up, at a glance — and what to do next. */
function Overview({ data, onSaved, goTo, onAddMoney }) {
  const wallet = data.wallet?.enabled ? data.wallet : null;
  const def = data.pickups?.find((p) => p.isDefault);
  const tiles = [
    {
      icon: MapPin,
      label: "Ships from",
      value: def ? `${def.label} · ${def.pincode}` : "No pickup address",
      note: def ? <PickupTag status={def.status} /> : null,
      action: <Button size="small" onClick={() => goTo("pickups")}>{def ? "Manage" : "Add address"}</Button>,
    },
    wallet && {
      icon: Wallet,
      label: "Wallet balance",
      value: inr(wallet.balance),
      note: wallet.balance < 100 ? <span className="text-[12px] text-[#B45309]">Low — add money to keep booking</span> : null,
      action: <Button size="small" type="primary" onClick={onAddMoney}>Add money</Button>,
    },
    {
      icon: Banknote,
      label: "COD held for you",
      value: inr(data.cod.held),
      note: <span className="text-[12px] text-ink-muted">Paid {data.holdDays} days after delivery</span>,
      action: <Button size="small" onClick={() => goTo("cod")}>{data.payout ? "View" : "Add bank"}</Button>,
    },
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <Card size="small" styles={{ body: { padding: 18 } }}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1F5FD6]">
            <PackageCheck size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="m-0 text-[15px] font-semibold text-ink">Oyklane Shipping</h3>
            <p className="m-0 mt-1 text-[13px] leading-relaxed text-ink-muted">
              From any order, compare couriers and prices for the pincode, book in one click and print the label — tracking reaches your customer by itself.{" "}
              {wallet ? "Each booking is paid from your shipping wallet; cancel before pickup and it's refunded at once." : "Shipping is billed with your plan."} Cash on delivery is collected for you and paid to your bank {data.holdDays} days after delivery.
            </p>
            {!data.ready && <Alert className="!mt-3" type="info" showIcon message="Oyklane Shipping is being switched on — you can save your details now." />}
          </div>
        </div>
      </Card>
      <div className={`grid gap-3 ${tiles.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col gap-2 rounded-xl border border-app-border bg-app-surface px-4 py-3.5">
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted">
              <t.icon size={14} aria-hidden="true" /> {t.label}
            </span>
            <span className="text-[17px] font-semibold tabular-nums text-ink">{t.value}</span>
            <div className="flex min-h-[24px] items-center justify-between gap-2">
              <span>{t.note}</span>
              {t.action}
            </div>
          </div>
        ))}
      </div>
      <AutoShip data={data} onSaved={onSaved} />
      {data.pickupReady && <RateChecker />}
    </div>
  );
}

/** Every address couriers collect from. One is the default; any can be
 * chosen when booking. */
function Pickups({ data, onSaved }) {
  const { message, modal } = App.useApp();
  const [editing, setEditing] = useState(null); // null | "new" | pickup
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();
  const list = data.pickups || [];

  async function save(values) {
    setBusy(true);
    try {
      const body = editing === "new" ? { ...values, new: true } : { ...values, id: editing.id };
      onSaved(await apiFetch("/api/shipping/oyklane/pickup", { method: "PUT", body }));
      message.success(editing === "new" ? "Pickup address added" : "Pickup address saved");
      setEditing(null);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function act(p, kind) {
    try {
      onSaved(await apiFetch(kind === "default" ? `/api/shipping/oyklane/pickups/${p.id}/default` : `/api/shipping/oyklane/pickups/${p.id}`, { method: kind === "default" ? "PUT" : "DELETE" }));
      message.success(kind === "default" ? `${p.label} is now your default` : "Pickup address removed");
    } catch (err) {
      message.error(err.message);
    }
  }

  return (
    <Card
      size="small"
      title="Pickup addresses"
      extra={
        <Button size="small" type={list.length ? "default" : "primary"} icon={<Plus size={14} aria-hidden="true" />} onClick={() => setEditing("new")} disabled={list.length >= 10}>
          Add address
        </Button>
      }
      styles={{ body: { padding: list.length ? 0 : 16 } }}
    >
      {list.length === 0 ? (
        <div className="py-6 text-center">
          <p className="m-0 text-[14px] font-medium text-ink">Add the address couriers pick up from</p>
          <p className="m-0 mt-1 text-[13px] text-ink-muted">Your shop, home or warehouse. The courier checks a new address, usually within 24 hours.</p>
          <Button type="primary" className="!mt-4" icon={<Plus size={15} aria-hidden="true" />} onClick={() => setEditing("new")}>
            Add pickup address
          </Button>
        </div>
      ) : (
        <ul className="m-0 list-none divide-y divide-app-border p-0">
          {list.map((p) => (
            <li key={p.id} className="flex items-start gap-3 px-4 py-3.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-ink-muted">
                <MapPin size={15} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 flex flex-wrap items-center gap-2 text-[14px] font-medium text-ink">
                  {p.label}
                  {p.isDefault && <Tag className="!m-0">Default</Tag>}
                  <PickupTag status={p.status} />
                </p>
                <p className="m-0 mt-0.5 text-[13px] text-ink-muted">
                  {[p.address1, p.address2, p.city, `${p.state} ${p.pincode}`].filter((x) => String(x || "").trim()).join(", ")}
                </p>
                <p className="m-0 text-[12.5px] text-ink-muted">
                  {p.name} · {p.phone}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button size="small" onClick={() => setEditing(p)}>
                  Edit
                </Button>
                <Dropdown
                  trigger={["click"]}
                  placement="bottomRight"
                  menu={{
                    items: [
                      { key: "default", icon: <Star size={14} aria-hidden="true" />, label: "Make default", disabled: p.isDefault, onClick: () => act(p, "default") },
                      {
                        key: "remove",
                        danger: true,
                        icon: <Trash2 size={14} aria-hidden="true" />,
                        label: "Remove",
                        disabled: list.length === 1,
                        onClick: () => modal.confirm({ title: `Remove ${p.label}?`, content: "Shipments already booked from it aren't affected.", okText: "Remove", okButtonProps: { danger: true }, onOk: () => act(p, "remove") }),
                      },
                    ],
                  }}
                >
                  <Button size="small" type="text" icon={<MoreHorizontal size={15} aria-hidden="true" />} aria-label={`More actions for ${p.label}`} />
                </Dropdown>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal open={Boolean(editing)} onCancel={() => setEditing(null)} title={editing === "new" ? "Add pickup address" : "Edit pickup address"} width={600} footer={null} destroyOnHidden>
        {editing && editing !== "new" && editing.status && <Alert className="!mb-4" type="info" showIcon message="Changing the address sends it to the courier for approval again." />}
        <Form form={form} key={editing === "new" ? "new" : editing?.id} layout="vertical" requiredMark={false} onFinish={save} initialValues={editing === "new" ? {} : editing || {}}>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="label" label="Name for this address" extra="Only you see it, e.g. Main shop or Jaipur warehouse." className="sm:col-span-2">
              <Input maxLength={40} placeholder="Main shop" />
            </Form.Item>
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
            <Form.Item name="email" label="Email (optional)">
              <Input maxLength={120} />
            </Form.Item>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={busy}>
              {editing === "new" ? "Add address" : "Save"}
            </Button>
          </div>
        </Form>
      </Modal>
    </Card>
  );
}

/** The usual parcel (each order can change it) and the packages products
 * ship in. */
function Parcels({ data, onSaved }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  useEffect(() => form.setFieldsValue(data.defaults), [data.defaults, form]);
  async function save(values) {
    setBusy(true);
    try {
      onSaved(await apiFetch("/api/shipping/oyklane/parcel", { method: "PUT", body: values }));
      message.success("Saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <Card size="small" title="Usual parcel">
        <p className="m-0 mb-3 text-[13px] text-ink-muted">Used when a product has no package set. You can change it on each order before booking.</p>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={save}>
          <div className="flex flex-wrap items-end gap-3">
            <Form.Item name="weightGrams" label="Weight" className="!mb-0">
              <InputNumber min={50} max={50000} suffix="g" className="!w-32" />
            </Form.Item>
            <Form.Item name="lengthCm" label="Length" className="!mb-0">
              <InputNumber min={1} max={200} suffix="cm" className="!w-28" />
            </Form.Item>
            <Form.Item name="widthCm" label="Width" className="!mb-0">
              <InputNumber min={1} max={200} suffix="cm" className="!w-28" />
            </Form.Item>
            <Form.Item name="heightCm" label="Height" className="!mb-0">
              <InputNumber min={1} max={200} suffix="cm" className="!w-28" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={busy}>
              Save
            </Button>
          </div>
        </Form>
      </Card>
      <PackagesCard />
    </div>
  );
}

/** Where cash on delivery is paid out, and what's held or paid. */
function CodPayouts({ data, onSaved }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data.payout) form.setFieldsValue({ holder: data.payout.holder, ifsc: data.payout.ifsc, bank: data.payout.bank });
  }, [data.payout, form]);
  async function save(values) {
    setBusy(true);
    try {
      onSaved(await apiFetch("/api/shipping/oyklane/payout", { method: "PUT", body: values }));
      message.success("Payout account saved");
      form.setFieldValue("accountNumber", "");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  const walletOn = data.wallet?.enabled;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3.5">
          <p className="m-0 text-[12.5px] text-ink-muted">Held for you</p>
          <p className="m-0 text-[22px] font-semibold tabular-nums">{inr(data.cod.held)}</p>
          <p className="m-0 text-[12px] text-ink-muted">
            {data.cod.heldCount} delivered COD order{data.cod.heldCount === 1 ? "" : "s"}, paid out {data.holdDays} days after delivery
          </p>
        </div>
        <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3.5">
          <p className="m-0 text-[12.5px] text-ink-muted">Paid to your bank</p>
          <p className="m-0 text-[22px] font-semibold tabular-nums">{inr(data.cod.paid)}</p>
          <p className="m-0 text-[12px] text-ink-muted">{data.payout ? `${data.payout.bank || "Account"} ${data.payout.account}` : "Add your bank account below"}</p>
        </div>
      </div>
      {!walletOn && (
        <p className="m-0 text-[12.5px] text-ink-muted">Courier charges are added to your plan bill. When a COD payout is due, courier charges not yet billed are taken from it first, and only the rest stays on your bill.</p>
      )}
      {data.deductions?.length > 0 && (
        <Card size="small" title="Courier charges taken from COD payouts">
          <ul className="m-0 pl-4 text-[13px]">
            {data.deductions.slice(0, 6).map((d, i) => (
              <li key={i}>
                {day(d.at)}: COD {inr(d.cod)} − courier charges {inr(d.freight)} = {inr(d.paid)} paid{d.reference ? ` (ref ${d.reference})` : ""}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {data.cod.entries.length > 0 && (
        <Card size="small" title="Recent COD orders" styles={{ body: { padding: 0 } }}>
          <Table
            size="small"
            rowKey="id"
            pagination={data.cod.entries.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
            dataSource={data.cod.entries}
            columns={[
              { title: "Order", dataIndex: "orderNumber", render: (n) => `#${n}` },
              { title: "Amount", dataIndex: "amount", align: "right", render: inr },
              { title: "Delivered", dataIndex: "deliveredAt", render: day },
              { title: "Payout", key: "p", render: (_, r) => (r.status === "paid" ? <Tag color="green">Paid {day(r.paidAt)}</Tag> : <Tag color="blue">On {day(r.releaseOn)}</Tag>) },
            ]}
          />
        </Card>
      )}
      <Card size="small" title="Bank account for payouts">
        <Form form={form} layout="vertical" requiredMark={false} onFinish={save}>
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
            <Button type="primary" htmlType="submit" loading={busy}>
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
          <InputNumber min={50} max={50000} suffix="g" className="!w-32" />
        </Form.Item>
        <Form.Item name="orderValue">
          <InputNumber min={1} prefix="₹" className="!w-36" />
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

/** Book new orders by themselves — the cheapest or the fastest courier,
 * with the parcel worked out from the products' packages. */
function AutoShip({ data, onSaved }) {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  async function save(patch) {
    setBusy(true);
    try {
      onSaved(await apiFetch("/api/shipping/oyklane/auto-ship", { method: "PUT", body: { mode: data.autoShip, cod: data.autoShipCod, ...patch } }));
      message.success("Saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card size="small" title={<span className="inline-flex items-center gap-2"><Zap size={15} aria-hidden="true" /> Automatic booking</span>}>
      <p className="m-0 mb-3 text-[13px] text-ink-muted">Book a courier for every new order as soon as it&apos;s placed (online orders once paid), from your default pickup address. If a booking fails, the order says why and you can ship it by hand.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={data.autoShip || "off"}
          disabled={busy}
          onChange={(mode) => save({ mode })}
          options={[
            { label: "Off", value: "off" },
            { label: "Cheapest courier", value: "cheapest" },
            { label: "Fastest courier", value: "fastest" },
          ]}
        />
        {data.autoShip && data.autoShip !== "off" && (
          <label className="inline-flex items-center gap-2 text-[13px] text-ink">
            <Switch size="small" checked={data.autoShipCod !== false} disabled={busy} onChange={(cod) => save({ cod })} />
            Cash on delivery orders too
          </label>
        )}
      </div>
    </Card>
  );
}
