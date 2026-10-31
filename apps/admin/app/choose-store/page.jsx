"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Form, Input, Skeleton } from "antd";
import { ChevronRight, Store } from "lucide-react";
import { BrandMark } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";

const ROLE = { owner: "Owner", admin: "Admin", staff: "Staff" };

/** After sign-in, when this login has more than one store: pick which one
 * to open. Switch any time from the store menu at the top. */
export default function ChooseStorePage() {
  const router = useRouter();
  const [stores, setStores] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/api/auth/my-stores")
      .then((d) => {
        if ((d.stores || []).length === 1) router.replace("/admin");
        else setStores(d.stores || []);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function create(v) {
    setBusy("create");
    setError(null);
    try {
      await apiFetch("/api/auth/stores", { method: "POST", body: { storeName: v.storeName } });
      window.location.href = "/admin";
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  }

  async function signOut() {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
  }

  async function open(id) {
    setBusy(id);
    setError(null);
    try {
      await apiFetch("/api/auth/switch-store", { method: "POST", body: { storeId: id } });
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandMark size={28} />
        </div>
        <div className="rounded-2xl border border-app-border bg-app-surface p-6 shadow-card">
          {stores && stores.length === 0 ? (
            <>
              <h1 className="m-0 text-[20px] font-semibold text-ink">No store on this login</h1>
              <p className="m-0 mt-1 mb-5 text-[13.5px] text-ink-muted">This login doesn&apos;t have a store any more — it may have moved to another login or been closed. Create a new one, or sign in with the email that has your store.</p>
              {error && <Alert type="error" showIcon className="!mb-4" message={error} />}
              <Form layout="vertical" requiredMark={false} onFinish={create}>
                <Form.Item name="storeName" label="Store name" rules={[{ required: true, message: "Give your store a name" }]}>
                  <Input maxLength={80} autoFocus />
                </Form.Item>
                <Button type="primary" htmlType="submit" block size="large" loading={busy === "create"}>
                  Create store
                </Button>
              </Form>
              <Button type="link" block className="!mt-2" onClick={signOut}>
                Sign in with another email
              </Button>
            </>
          ) : (
            <>
          <h1 className="m-0 text-[20px] font-semibold text-ink">Choose a store</h1>
          <p className="m-0 mt-1 mb-5 text-[13.5px] text-ink-muted">Your login has more than one store. You can switch any time from the store menu.</p>
          {error && <Alert type="error" showIcon className="!mb-4" message={error} />}
          {!stores ? (
            <Skeleton active paragraph={{ rows: 3 }} title={false} />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {stores.map((s) => (
                <li key={s.id}>
                  <Button block size="large" loading={busy === s.id} disabled={Boolean(busy) && busy !== s.id} onClick={() => open(s.id)} className="!flex !h-auto !items-center !justify-between !rounded-xl !px-4 !py-3 !text-left">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                        <Store size={17} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[14.5px] font-medium text-ink">{s.name}</span>
                        <span className="block truncate text-[12.5px] text-ink-muted">
                          {s.handle}.oyklane.com · {ROLE[s.role] || s.role}
                        </span>
                      </span>
                    </span>
                    <ChevronRight size={17} className="shrink-0 text-ink-muted" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
