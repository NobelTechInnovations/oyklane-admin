"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { App, Alert, Button, Card, Form, Input, Radio, Skeleton, Switch } from "antd";
import { PageHeader } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";

/** Settings ▸ Support chat: the chat bubble on the store (Growth and Pro). */
export default function SupportChatSettings() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [store, setStore] = useState(null);
  const [saving, setSaving] = useState(false);
  const v = Form.useWatch([], form) || {};

  useEffect(() => {
    apiFetch("/api/store")
      .then((d) => {
        setStore(d);
        const c = d.store?.settings?.storeChat || {};
        form.setFieldsValue({ enabled: c.enabled !== false, greeting: c.greeting || "", color: c.color || "", position: c.position || "right" });
      })
      .catch((err) => message.error(err.message));
  }, [form, message]);

  async function save(values) {
    setSaving(true);
    try {
      await apiFetch("/api/store", { method: "PATCH", body: { settings: { storeChat: { ...values, color: /^#[0-9a-f]{6}$/i.test(values.color || "") ? values.color : "" } } } });
      message.success("Support chat saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!store) return <Skeleton active />;
  const plan = String(store.subscription?.plan?.key || store.plan?.key || "").toLowerCase();
  const included = plan ? plan !== "starter" : true;
  return (
    <div>
      <PageHeader title="Support chat" backHref="/admin/settings" />
      {!included && (
        <Alert className="mb-4" type="info" showIcon message="The support chat comes with the Growth and Pro plans" action={<Link href="/admin/settings/billing"><Button size="small" type="primary">See plans</Button></Link>} />
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <Card>
          <Form form={form} layout="vertical" requiredMark={false} onFinish={save}>
            <Form.Item name="enabled" label="Show the chat bubble on my store" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="greeting" label="First message" extra="Shoppers see this when they open the chat.">
              <Input maxLength={160} placeholder="Hi! Ask me about products, delivery, returns or your order." />
            </Form.Item>
            <div className="grid sm:grid-cols-2 gap-x-4">
              <Form.Item name="color" label="Colour (optional)">
                <Input maxLength={7} placeholder="#111111" />
              </Form.Item>
              <Form.Item name="position" label="Corner">
                <Radio.Group optionType="button" options={[{ value: "right", label: "Bottom right" }, { value: "left", label: "Bottom left" }]} />
              </Form.Item>
            </div>
            <Button type="primary" htmlType="submit" loading={saving}>
              Save
            </Button>
          </Form>
        </Card>
        <Card size="small" title="How it works">
          <ul className="m-0 pl-4 text-[13px] text-ink-muted flex flex-col gap-1.5">
            <li>Answers only about your store: products, prices, stock, delivery, returns.</li>
            <li>“Track my order” shows an order only with its number and the buyer&apos;s phone or email.</li>
            <li>“Talk to the store” sends you a ticket in Customers ▸ Queries; you reply by email.</li>
            <li>It learns from your products and your Refund and Shipping policies — keep them up to date.</li>
          </ul>
          <div className="mt-3 rounded-2xl border border-app-border p-3 text-[13px]">
            <p className="m-0 font-semibold">Preview</p>
            <div className="mt-2 rounded-xl bg-[#F4F4F5] px-3 py-2">{v.greeting || "Hi! Ask me about products, delivery, returns or your order."}</div>
            <div className="mt-2 flex justify-end">
              <span className="rounded-full px-3 py-1.5 text-white" style={{ background: /^#[0-9a-f]{6}$/i.test(v.color || "") ? v.color : "#111" }}>Chat</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
