"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Alert } from "antd";
import { AuthShell } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { acquisition, rememberUtm } from "@/lib/acquisition";
import { track } from "@/lib/track";
import { GoogleSignIn } from "@/components/GoogleSignIn";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://oyklane.com";

/** The name and email inside a Google sign-up ticket — display only; the
 * API checks the ticket's signature when the store is created. */
function readTicket(ticket) {
  try {
    const part = ticket.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const data = JSON.parse(decodeURIComponent(escape(atob(part))));
    return { name: data.name || "", email: data.email || "" };
  } catch {
    return null;
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [google, setGoogle] = useState(null);
  // Email sign-up: the 6-digit code step (values kept until it's confirmed).
  const [pending, setPending] = useState(null); // { values, ticket }
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function sendCode(values) {
    const { ticket } = await apiFetch("/api/auth/register/code", { method: "POST", body: { email: values.email, name: values.name } });
    setPending({ values, ticket });
    setCode("");
    setResendIn(45);
  }

  async function confirm() {
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/register", { method: "POST", body: { ...pending.values, emailCode: code, emailTicket: pending.ticket, acquisition: acquisition() } });
      track("sign_up", { method: "email" });
      track("store_created");
      router.push("/welcome");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Back from "Continue with Google" with a new email: just name the store.
  useEffect(() => {
    const ticket = new URLSearchParams(window.location.search).get("google");
    const who = ticket && readTicket(ticket);
    if (who) setGoogle({ ticket, ...who });
    rememberUtm();
  }, []);

  async function onFinish(values) {
    setError(null);
    setLoading(true);
    try {
      if (!google) {
        await sendCode(values);
        return;
      }
      await apiFetch("/api/auth/google/register", { method: "POST", body: { ticket: google.ticket, storeName: values.storeName, whatsapp: values.whatsapp, acquisition: acquisition() } });
      track("sign_up", { method: "google" });
      track("store_created");
      router.push("/welcome");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      homeHref={SITE_URL}
      title="Start your store"
      subtitle="3-day free trial, then ₹49 for your first month."
      photo="bags"
      note={
        <>
          By continuing, you agree to Oyklane&apos;s{" "}
          <a href={`${SITE_URL}/terms`} className="underline underline-offset-2 text-ink-muted hover:text-ink">Terms of service</a> and{" "}
          <a href={`${SITE_URL}/privacy`} className="underline underline-offset-2 text-ink-muted hover:text-ink">Privacy policy</a>.
        </>
      }
      footer={
        <>
          Already selling on Oyklane?{" "}
          <a href="/login" className="text-ink font-medium underline underline-offset-4 decoration-ink/20 hover:decoration-ink">
            Sign in
          </a>
        </>
      }
    >
      {error && <Alert type="error" message={error} showIcon className="mb-5" />}
      {google && (
        <Alert
          type="info"
          showIcon
          className="mb-5"
          message={`Continuing as ${google.name ? `${google.name} (${google.email})` : google.email}`}
          description="Name your store to finish. You'll sign in with Google."
        />
      )}
      {pending ? (
        <div className="flex flex-col gap-4">
          <p className="m-0 text-[14px] text-ink">
            We sent a 6-digit code to <b>{pending.values.email}</b>. Enter it to create your store.
          </p>
          <Input.OTP length={6} size="large" value={code} onChange={setCode} autoFocus inputMode="numeric" aria-label="6-digit code" />
          <Button type="primary" block size="large" loading={loading} disabled={code.length !== 6} onClick={confirm}>
            Create store
          </Button>
          <div className="flex items-center justify-between text-[13px]">
            <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-ink-muted underline underline-offset-2" onClick={() => (setPending(null), setError(null))}>
              Change email
            </button>
            <button
              type="button"
              disabled={resendIn > 0 || loading}
              className="cursor-pointer border-0 bg-transparent p-0 text-ink underline underline-offset-2 disabled:cursor-default disabled:text-ink-subtle disabled:no-underline"
              onClick={async () => {
                setError(null);
                try {
                  await sendCode(pending.values);
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              {resendIn > 0 ? `Send again in ${resendIn}s` : "Send the code again"}
            </button>
          </div>
        </div>
      ) : (
        <>
      {!google && <GoogleSignIn divider="Or sign up with email" />}

      <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
        <Form.Item label="Store name" name="storeName" rules={[{ required: true, min: 2, message: "Store name is too short" }]}>
          <Input placeholder="Aurora Goods" autoFocus />
        </Form.Item>
        {!google && (
          <>
            <Form.Item label="Your name" name="name" rules={[{ required: true, min: 2, message: "Name is too short" }]}>
              <Input autoComplete="name" placeholder="Priya Sharma" />
            </Form.Item>
            <Form.Item label="Email" name="email" rules={[{ required: true, type: "email", message: "Enter a valid email" }]}>
              <Input autoComplete="email" placeholder="you@company.com" />
            </Form.Item>
            <Form.Item
              label="Password"
              name="password"
              extra="At least 8 characters."
              rules={[{ required: true, min: 8, message: "At least 8 characters" }]}
            >
              <Input.Password autoComplete="new-password" placeholder="••••••••" />
            </Form.Item>
          </>
        )}
        <Form.Item
          label="WhatsApp number (optional)"
          name="whatsapp"
          extra="Only so our team can help if you get stuck setting up."
          rules={[{ pattern: /^[+\d][\d\s()-]{7,22}$/, message: "Enter a valid WhatsApp number" }]}
        >
          <Input autoComplete="tel" inputMode="tel" placeholder="98765 43210" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading} size="large" className="!mt-2">
          {google ? "Create store" : "Continue"}
        </Button>
      </Form>
        </>
      )}
    </AuthShell>
  );
}
