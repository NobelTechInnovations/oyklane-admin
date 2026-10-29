"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button } from "antd";
import { apiFetch } from "@/lib/api";

function Accept() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const { store } = await apiFetch("/api/auth/store-transfer/accept", { method: "POST", body: { token } });
      await apiFetch("/api/auth/switch-store", { method: "POST", body: { storeId: store.id } }).catch(() => {});
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      if (err.status === 401) router.replace(`/login?next=${encodeURIComponent(`/accept-transfer?token=${token}`)}`);
      else setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-app-border bg-app-surface p-7 shadow-card">
        <h1 className="m-0 text-[20px] font-semibold text-ink">Accept a store</h1>
        <p className="m-0 mt-1 mb-5 text-[13.5px] text-ink-muted">A store's owner asked to move it to your login. Accept to become its owner — its plan, orders and settings stay as they are, and the old login's access ends.</p>
        {!token && <Alert type="error" showIcon message="This link is missing its token." />}
        {error && <Alert type="error" showIcon className="!mb-4" message={error} />}
        <Button type="primary" block size="large" disabled={!token} loading={busy} onClick={accept}>
          Accept store
        </Button>
        <p className="m-0 mt-4 text-center text-[12.5px] text-ink-muted">
          Signed in with a different email? <Link href={`/login?next=${encodeURIComponent(`/accept-transfer?token=${token || ""}`)}`}>Sign in again</Link>
        </p>
      </div>
    </div>
  );
}

export default function AcceptTransferPage() {
  return (
    <Suspense fallback={null}>
      <Accept />
    </Suspense>
  );
}
