"use client";

import { track } from "@/lib/track";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Alert } from "antd";
import { AuthShell } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { useHumanCheck } from "@/components/HumanCheck";
import { ContinueAs } from "@/components/SaveLoginPrompt";

// The marketing site — where the logo goes.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://oyklane.com";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const human = useHumanCheck();
  // A saved login on this device: "Continue as …" (API remember/service.js).
  const [known, setKnown] = useState(null);
  useEffect(() => {
    apiFetch("/api/auth/remembered")
      .then((d) => setKnown(d.known || null))
      .catch(() => {});
  }, []);
  async function afterSignIn() {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) return router.push(next);
    const mine = await apiFetch("/api/auth/my-stores").catch(() => ({ stores: [] }));
    router.push(mine.stores?.length === 1 ? "/admin" : "/choose-store");
    router.refresh();
  }

  // Back from a Google sign-in that didn't work out (?error=…).
  useEffect(() => {
    const message = new URLSearchParams(window.location.search).get("error");
    if (message) {
      setError(message.slice(0, 200));
      window.history.replaceState(null, "", "/login");
    }
  }, []);

  async function onFinish(values) {
    setError(null);
    setLoading(true);
    try {
      const r = await apiFetch("/api/auth/login", { method: "POST", body: { ...values, turnstileToken: human.token } });
      track("login", { method: "email" }, { eventID: r?.trackEventId });
      // Back to where a link sent them (e.g. accepting a store)…
      const next = new URLSearchParams(window.location.search).get("next");
      if (next && next.startsWith("/") && !next.startsWith("//")) return router.push(next);
      // …else, with more than one store on this login, pick which to open.
      const mine = await apiFetch("/api/auth/my-stores").catch(() => ({ stores: [] }));
      router.push(mine.stores?.length === 1 ? "/admin" : "/choose-store");
      router.refresh();
    } catch (err) {
      setError(err.message);
      human.reset();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      homeHref={SITE_URL}
      title="Log in to your store"
      subtitle="Welcome back — your orders are waiting."
      photo="packing"
      note={
        <>
          By continuing, you agree to Oyklane&apos;s{" "}
          <a href={`${SITE_URL}/terms`} className="underline underline-offset-2 text-ink-muted hover:text-ink">Terms of service</a> and{" "}
          <a href={`${SITE_URL}/privacy`} className="underline underline-offset-2 text-ink-muted hover:text-ink">Privacy policy</a>.
        </>
      }
      footer={
        <>
          New to Oyklane?{" "}
          <a href="/register" className="text-ink font-medium underline underline-offset-4 decoration-ink/20 hover:decoration-ink">
            Create a store
          </a>
        </>
      }
    >
      {error && <Alert type="error" message={error} showIcon className="mb-5" />}
      {known && <ContinueAs known={known} onSignedIn={afterSignIn} onForget={() => setKnown(null)} />}
      <GoogleSignIn />

      <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
        <Form.Item label="Email" name="email" rules={[{ required: true, type: "email", message: "Enter a valid email" }]}>
          <Input autoComplete="email" placeholder="you@company.com" autoFocus />
        </Form.Item>
        <Form.Item
          label={
            <span className="flex w-full items-center justify-between gap-4">
              Password
              <a href="/forgot-password" className="text-[13px] font-normal text-ink-muted underline underline-offset-4 decoration-ink/20 hover:text-ink">
                Forgot password?
              </a>
            </span>
          }
          name="password"
          rules={[{ required: true, message: "Password is required" }]}
        >
          <Input.Password autoComplete="current-password" placeholder="••••••••" />
        </Form.Item>
        {human.element}
        <Button type="primary" htmlType="submit" block loading={loading} disabled={!human.ready} size="large" className="!mt-2">
          Continue with email
        </Button>
      </Form>
    </AuthShell>
  );
}
