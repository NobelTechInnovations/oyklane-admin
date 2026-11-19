"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Button, Modal, Form, Input, Select, InputNumber, App, Radio } from "antd";
import { Plus, Trash2 } from "lucide-react";
import { useConfirmDialog } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { currencySymbol, formatCurrency } from "@/lib/money";

// "*" covers every country no other zone lists.
const ZONE_COUNTRIES = [{ value: "*", label: "Rest of the world (every other country)" }, ...COUNTRY_OPTIONS];
const countryName = (code) => (code === "*" ? "Rest of the world" : COUNTRY_OPTIONS.find((c) => c.value === code)?.label || code);
const weightText = (r) => {
  const kg = (g) => (g >= 1000 ? `${Math.round((g / 1000) * 100) / 100} kg` : `${g} g`);
  if (r.minWeightGrams != null && r.maxWeightGrams != null) return `${kg(r.minWeightGrams)} to ${kg(r.maxWeightGrams)}`;
  if (r.minWeightGrams != null) return `${kg(r.minWeightGrams)} and over`;
  if (r.maxWeightGrams != null) return `under ${kg(r.maxWeightGrams)}`;
  return null;
};

export function ShippingSettings() {
  const { message } = App.useApp();
  const { confirmDialog } = useConfirmDialog();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [rateModalZoneId, setRateModalZoneId] = useState(null);
  const [zoneForm] = Form.useForm();
  const [rateForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/shipping/zones");
      setZones(data.zones);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateZone(values) {
    try {
      await apiFetch("/api/shipping/zones", {
        method: "POST",
        body: { name: values.name, countries: values.countries.join(",") },
      });
      setZoneModalOpen(false);
      zoneForm.resetFields();
      load();
    } catch (err) {
      message.error(err.message);
    }
  }

  function handleDeleteZone(zone) {
    confirmDialog({
      title: `Delete "${zone.name}"?`,
      description: "This removes all its shipping rates too.",
      okText: "Delete",
      danger: true,
      onConfirm: async () => {
        await apiFetch(`/api/shipping/zones/${zone.id}`, { method: "DELETE" });
        load();
      },
    });
  }

  async function handleAddRate(values) {
    try {
      await apiFetch(`/api/shipping/zones/${rateModalZoneId}/rates`, { method: "POST", body: values });
      setRateModalZoneId(null);
      rateForm.resetFields();
      load();
    } catch (err) {
      message.error(err.message);
    }
  }

  function handleDeleteRate(zoneId, rate) {
    confirmDialog({
      title: `Delete "${rate.name}"?`,
      okText: "Delete",
      danger: true,
      onConfirm: async () => {
        await apiFetch(`/api/shipping/zones/${zoneId}/rates/${rate.id}`, { method: "DELETE" });
        load();
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[13px] text-ink-muted">Each zone lists the countries it delivers to. Checkout charges the cheapest rate of the buyer&apos;s country (by parcel weight when a rate has one). A country no zone lists isn&apos;t delivered to, unless a zone covers the rest of the world.</p>
      <div className="flex justify-end">
        <Button type="primary" icon={<Plus size={14} aria-hidden="true" />} onClick={() => setZoneModalOpen(true)}>
          Add zone
        </Button>
      </div>

      {!loading && zones.length === 0 && (
        <p className="text-sm text-ink-muted">
          No shipping zones yet — the storefront cart won&apos;t show a shipping estimate until you add one.
        </p>
      )}

      {zones.map((zone) => (
        <Card
          key={zone.id}
          size="small"
          title={zone.name}
          extra={
            <div className="flex gap-2">
              <Button size="small" icon={<Plus size={12} aria-hidden="true" />} onClick={() => setRateModalZoneId(zone.id)}>
                Add rate
              </Button>
              <Button size="small" danger type="text" icon={<Trash2 size={12} aria-hidden="true" />} onClick={() => handleDeleteZone(zone)} />
            </div>
          }
        >
          <p className="text-xs text-ink-muted mb-3">Countries: {String(zone.countries || "").split(",").filter(Boolean).map(countryName).join(", ")}</p>
          {zone.rates.length === 0 && <p className="text-sm text-ink-muted">No rates yet.</p>}
          {zone.rates.map((rate) => (
            <div key={rate.id} className="flex items-center justify-between py-2 border-t border-app-border first:border-t-0">
              <div>
                <p className="text-sm m-0">{rate.name}</p>
                <p className="text-xs text-ink-muted m-0">
                  {formatCurrency(Number(rate.price))}
                  {rate.perKg ? ` + ${formatCurrency(Number(rate.perKg))} per kg` : ""}
                  {weightText(rate) ? ` · parcels ${weightText(rate)}` : ""}
                  {rate.freeAbove ? ` · free above ${formatCurrency(Number(rate.freeAbove))}` : ""}
                </p>
              </div>
              <Button type="text" danger size="small" icon={<Trash2 size={13} aria-hidden="true" />} onClick={() => handleDeleteRate(zone.id, rate)} />
            </div>
          ))}
        </Card>
      ))}

      <Modal title="Add shipping zone" open={zoneModalOpen} onCancel={() => setZoneModalOpen(false)} onOk={() => zoneForm.submit()} okText="Add zone" destroyOnHidden>
        <Form layout="vertical" form={zoneForm} onFinish={handleCreateZone} requiredMark={false}>
          <Form.Item name="name" label="Zone name" rules={[{ required: true, message: "Required" }]}>
            <Input placeholder="India" />
          </Form.Item>
          <Form.Item name="countries" label="Countries" rules={[{ required: true, message: "Select at least one" }]}>
            <Select mode="multiple" options={ZONE_COUNTRIES} optionFilterProp="label" placeholder="Select countries" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Add shipping rate" open={Boolean(rateModalZoneId)} onCancel={() => setRateModalZoneId(null)} onOk={() => rateForm.submit()} okText="Add rate" destroyOnHidden>
        <Form layout="vertical" form={rateForm} onFinish={handleAddRate} requiredMark={false}>
          <Form.Item name="name" label="Rate name" rules={[{ required: true, message: "Required" }]}>
            <Input placeholder="Standard" />
          </Form.Item>
          <Form.Item name="price" label="Price" rules={[{ required: true, message: "Required" }]}>
            <InputNumber min={0} className="w-full" prefix={currencySymbol()} />
          </Form.Item>
          <Form.Item name="freeAbove" label="Free above (optional)">
            <InputNumber min={0} className="w-full" prefix={currencySymbol()} />
          </Form.Item>
          <p className="m-0 mb-2 text-xs text-ink-muted">By weight (optional): this rate is only for parcels in this range, and can add a price for each kg.</p>
          <div className="grid grid-cols-3 gap-2">
            <Form.Item name="minWeightGrams" label="From (grams)" className="mb-0">
              <InputNumber min={0} className="w-full" placeholder="0" />
            </Form.Item>
            <Form.Item name="maxWeightGrams" label="Up to (grams)" className="mb-0">
              <InputNumber min={1} className="w-full" placeholder="No limit" />
            </Form.Item>
            <Form.Item name="perKg" label="Per kg" className="mb-0">
              <InputNumber min={0} className="w-full" prefix={currencySymbol()} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

/** Duties and import taxes on international orders (API shipping/service.js dutiesFor). */
export function DutiesSettings() {
  const { message } = App.useApp();
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    apiFetch("/api/shipping/duties")
      .then((r) => setD(r.duties))
      .catch(() => setD({ mode: "off", pct: 0, threshold: 0, countries: [] }));
  }, []);
  async function save() {
    setBusy(true);
    try {
      const r = await apiFetch("/api/shipping/duties", { method: "PUT", body: d });
      setD(r.duties);
      message.success("Saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  if (!d) return <Card size="small" loading />;
  const setRow = (k, patch) => setD({ ...d, countries: d.countries.map((c, j) => (j === k ? { ...c, ...patch } : c)) });
  return (
    <Card size="small" title="Duties and import taxes">
      <p className="m-0 mb-3 text-[13px] text-ink-muted">For orders delivered to another country. Collecting them at checkout means your buyer pays nothing more at the door.</p>
      <Radio.Group value={d.mode} onChange={(e) => setD({ ...d, mode: e.target.value })} className="flex flex-col gap-2">
        <Radio value="off">Off</Radio>
        <Radio value="notice">Tell buyers they may pay them on delivery</Radio>
        <Radio value="collect">Collect them at checkout</Radio>
      </Radio.Group>
      {d.mode === "collect" && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Duty rate for every country (%)</span>
              <InputNumber className="!w-full" min={0} max={100} value={d.pct} onChange={(pct) => setD({ ...d, pct: pct ?? 0 })} />
            </label>
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Tax-free up to (order value)</span>
              <InputNumber className="!w-full" min={0} prefix={currencySymbol()} value={d.threshold} onChange={(threshold) => setD({ ...d, threshold: threshold ?? 0 })} />
            </label>
          </div>
          <p className="m-0 text-[12px] text-ink-muted">Charged on what the items cost after discounts, when the order is above the tax-free amount. Add countries with their own rate below.</p>
          {d.countries.map((c, k) => (
            <div key={k} className="grid grid-cols-[1fr_110px_140px_auto] items-end gap-2">
              <label>
                <span className="mb-1 block text-[12px] text-ink-muted">Country</span>
                <Select showSearch optionFilterProp="label" options={COUNTRY_OPTIONS} value={c.country || undefined} onChange={(country) => setRow(k, { country })} placeholder="Choose" className="!w-full" />
              </label>
              <label>
                <span className="mb-1 block text-[12px] text-ink-muted">Rate (%)</span>
                <InputNumber className="!w-full" min={0} max={100} value={c.pct} onChange={(pct) => setRow(k, { pct: pct ?? 0 })} />
              </label>
              <label>
                <span className="mb-1 block text-[12px] text-ink-muted">Tax-free up to</span>
                <InputNumber className="!w-full" min={0} prefix={currencySymbol()} value={c.threshold} onChange={(threshold) => setRow(k, { threshold: threshold ?? 0 })} />
              </label>
              <Button type="text" danger icon={<Trash2 size={14} aria-hidden="true" />} aria-label="Remove country" onClick={() => setD({ ...d, countries: d.countries.filter((_, j) => j !== k) })} />
            </div>
          ))}
          <div>
            <Button size="small" icon={<Plus size={12} aria-hidden="true" />} onClick={() => setD({ ...d, countries: [...d.countries, { country: "", pct: d.pct, threshold: d.threshold }] })}>
              Add a country
            </Button>
          </div>
        </div>
      )}
      <div className="mt-4">
        <Button type="primary" loading={busy} onClick={save}>
          Save
        </Button>
      </div>
    </Card>
  );
}
