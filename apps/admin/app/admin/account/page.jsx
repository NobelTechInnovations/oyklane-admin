"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, App, Button, Card, Form, Input, Skeleton } from "antd";
import { ArrowRightLeft, Mail } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";

/** Your account: the login email (changed with a code sent to the new
 * address) and moving this store to another Oyklane login. */
export default function AccountPage() {
  const { message } = App.useApp();
  const [me, setMe] = useState(null);
  const [store, setStore] = useState(null);
  const [step, setStep] = useState(null); // { sentTo } after the code is sent
  const [sent, setSent] = useState(null);
  const [busy, setBusy] = useState(null);
  const [emailForm] = Form.useForm();
  const [codeForm] = Form.useForm();
  const [moveForm] = Form.useForm();

  useEffect(() => {
    Promise.all([apiFetch("/api/auth/me"), apiFetch("/api/store")])
      .then(([m, s]) => {
        setMe(m.user || m);
        setStore(s);
      })
      .catch((err) => message.error(err.message));
  }, [message]);

  async function sendCode(v) {
    setBusy("code");
    try {
      setStep(await apiFetch("/api/auth/email/change", { method: "POST", body: v }));
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }
  async function confirm(v) {
    setBusy("confirm");
    try {
      const { email } = await apiFetch("/api/auth/email/change/confirm", { method: "POST", body: v });
      setMe((u) => ({ ...u, email }));
      setStep(null);
      emailForm.resetFields();
      codeForm.resetFields();
      message.success(`Your login email is now ${email}`);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }
  async function move(v) {
    setBusy("move");
    try {
      setSent(await apiFetch("/api/auth/store-transfer", { method: "POST", body: v }));
      moveForm.resetFields();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  if (!me) return <Skeleton active paragraph={{ rows: 6 }} />;
  const owner = store?.role === "owner";
  const storeName = store?.store?.name || store?.name || "this store";
  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <PageHeader title="Your account" subtitle={`${me.name || ""}${me.name ? " · " : ""}${me.email}`} />

      <Card size="small" title={<span className="inline-flex items-center gap-2"><Mail size={15} aria-hidden="true" /> Login email</span>} styles={{ body: { padding: 20 } }}>
        <p className="m-0 mb-4 text-[13.5px] text-ink">
          You sign in with <b>{me.email}</b>. To change it, enter the new email — we send a code there to make sure it&apos;s yours.
        </p>
        {!step ? (
          <Form form={emailForm} layout="vertical" requiredMark={false} onFinish={sendCode}>
            <div className="grid gap-x-3 sm:grid-cols-2">
              <Form.Item name="email" label="New login email" rules={[{ required: true, type: "email", message: "Enter a valid email" }]}>
                <Input autoComplete="email" />
              </Form.Item>
              <Form.Item name="currentPassword" label="Current password" rules={[{ required: true, message: "Your password" }]} extra={<span>Signed up with Google? <Link href="/forgot-password">Set a password</Link> first.</span>}>
                <Input.Password autoComplete="current-password" />
              </Form.Item>
            </div>
            <Button type="primary" htmlType="submit" loading={busy === "code"}>
              Send code
            </Button>
          </Form>
        ) : (
          <Form form={codeForm} layout="vertical" requiredMark={false} onFinish={confirm}>
            <Alert type="info" showIcon className="!mb-4" message={`We sent a 6-digit code to ${step.sentTo}. It works for 15 minutes.`} />
            <Form.Item name="code" label="Code" rules={[{ required: true, pattern: /^\d{6}$/, message: "6 digits" }]}>
              <Input inputMode="numeric" maxLength={6} className="!w-40 font-mono" autoFocus />
            </Form.Item>
            <div className="flex gap-2">
              <Button type="primary" htmlType="submit" loading={busy === "confirm"}>
                Change email
              </Button>
              <Button onClick={() => setStep(null)}>Back</Button>
            </div>
          </Form>
        )}
      </Card>

      <Card size="small" title={<span className="inline-flex items-center gap-2"><ArrowRightLeft size={15} aria-hidden="true" /> Move {storeName} to another login</span>} styles={{ body: { padding: 20 } }}>
        <p className="m-0 mb-4 text-[13.5px] text-ink">
          Made two stores with two emails? Move this one to your other Oyklane login — then one sign-in opens both, and you pick the store. Its plan, orders and settings stay as they are; this login loses access once it&apos;s accepted.
        </p>
        {!owner ? (
          <Alert type="info" showIcon message="Only the store's owner can move it." />
        ) : sent ? (
          <Alert type="success" showIcon message={`Sent to ${sent.sentTo}. Sign in with that email and open the link to accept.`} action={<Button size="small" onClick={() => setSent(null)}>Send again</Button>} />
        ) : (
          <Form form={moveForm} layout="vertical" requiredMark={false} onFinish={move}>
            <div className="grid gap-x-3 sm:grid-cols-2">
              <Form.Item name="email" label="The other login's email" rules={[{ required: true, type: "email", message: "Enter a valid email" }]}>
                <Input />
              </Form.Item>
              <Form.Item name="currentPassword" label="Your current password" rules={[{ required: true, message: "Your password" }]}>
                <Input.Password autoComplete="current-password" />
              </Form.Item>
            </div>
            <Button htmlType="submit" loading={busy === "move"}>
              Send move request
            </Button>
          </Form>
        )}
      </Card>
    </div>
  );
}
