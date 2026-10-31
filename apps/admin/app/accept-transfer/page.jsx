"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Result } from "antd";
import { apiFetch } from "@/lib/api";

/**
 * A store move's emailed links. side=owner: the store's owner approves
 * (no sign-in — the link reached their inbox). side=new: the other login
 * accepts, signed in with that email. The store moves once both have.
 */
function Answer() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const owner = params.get("side") === "owner";
  const here = `/accept-transfer?side=${owner ? "owner" : "new"}&token=${encodeURIComponent(token || "")}`;
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function answer() {
    setBusy(true);
    setError(null);
    try {
      const r = await apiFetch(owner ? "/api/auth/store-transfer/approve" : "/api/auth/store-transfer/accept", { method: "POST", body: { token } });
      if (r.status === "done" && !owner) {
        await apiFetch("/api/auth/switch-store", { method: "POST", body: { storeId: r.store.id } }).catch(() => {});
        router.replace("/admin");
        router.refresh();
        return;
      }
      setResult(r);
    } catch (err) {
      if (err.status === 401) router.replace(`/login?next=${encodeURIComponent(here)}`);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const done = result.status === "done";
    const title = done ? `${result.store.name} has moved` : result.status === "waiting_new" ? `Approved — waiting for ${result.to} to accept` : "Accepted — waiting for the owner to approve";
    const sub = done
      ? "The other login is its owner now."
      : result.status === "waiting_new"
        ? "We emailed them a link. The store moves as soon as they accept."
        : "We emailed the owner too. The store moves to your login as soon as they approve.";
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg px-4">
        <Result
          status={done ? "success" : "info"}
          title={title}
          subTitle={sub}
          extra={
            <Link href="/admin">
              <Button type="primary">Go to your dashboard</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-app-border bg-app-surface p-7 shadow-card">
        <h1 className="m-0 text-[20px] font-semibold text-ink">{owner ? "Approve moving your store" : "Accept a store"}</h1>
        <p className="m-0 mt-1 mb-5 text-[13.5px] text-ink-muted">
          {owner
            ? "You asked to move your store to another Oyklane login. Approve to confirm — it moves once that login has accepted too. Its plan, orders and settings stay as they are."
            : "A store's owner asked to move it to your login. Accept to become its owner — it moves once the owner has approved too. Its plan, orders and settings stay as they are."}
        </p>
        {!token && <Alert type="error" showIcon message="This link is missing its token." />}
        {error && <Alert type="error" showIcon className="!mb-4" message={error} />}
        <Button type="primary" block size="large" disabled={!token} loading={busy} onClick={answer}>
          {owner ? "Approve the move" : "Accept store"}
        </Button>
        {!owner && (
          <p className="m-0 mt-4 text-center text-[12.5px] text-ink-muted">
            Signed in with a different email? <Link href={`/login?next=${encodeURIComponent(here)}`}>Sign in again</Link> · No login yet?{" "}
            <Link href={`/register?next=${encodeURIComponent(here)}`}>Create one</Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function AcceptTransferPage() {
  return (
    <Suspense fallback={null}>
      <Answer />
    </Suspense>
  );
}
