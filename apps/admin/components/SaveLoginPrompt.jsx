"use client";

import { useState } from "react";
import { Button, Checkbox, Modal } from "antd";
import { CircleCheck, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";

/**
 * Signing out: "Save your login on this device?" (API remember/service.js).
 * Saved, the next sign-in here is one click, no password, for 30 days.
 * `open` shows it; `onDone` runs after the session ends.
 */
export function SaveLoginPrompt({ open, onClose, onDone }) {
  // On by default; the merchant can untick it here or change it in Settings ▸ Sign-in and privacy.
  const [track, setTrack] = useState(true);
  const [busy, setBusy] = useState(null);
  async function signOut(remember) {
    setBusy(remember ? "save" : "plain");
    await apiFetch("/api/auth/logout", { method: "POST", body: { remember, track: remember && track } }).catch(() => {});
    setBusy(null);
    onDone();
  }
  return (
    <Modal open={open} onCancel={onClose} footer={null} width={380} centered destroyOnHidden styles={{ content: { padding: 20, borderRadius: 12 } }}>
      <div className="flex items-center gap-3 pr-7">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eaf1ff] text-[#2563eb]" aria-hidden="true">
          <ShieldCheck size={22} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h2 className="m-0 text-[16px] font-semibold leading-snug text-ink">Save login on this device?</h2>
          <p className="m-0 text-[12.5px] text-ink-muted">Oyklane dashboard</p>
        </div>
      </div>
      <p className="mb-0 mt-3 flex items-start gap-1.5 text-[13px] text-ink">
        <CircleCheck size={15} className="mt-0.5 shrink-0 text-[#2563eb]" aria-hidden="true" />
        <span>Next time, continue in one click without your password.</span>
      </p>
      <p className="mb-0 mt-1.5 text-[12.5px] text-ink-muted">Only on this device, for 30 days. Don&apos;t save it on a shared computer.</p>
      <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12.5px] text-ink-muted">
        <Checkbox checked={track} onChange={(e) => setTrack(e.target.checked)} className="mt-px" />
        <span>Help improve Oyklane by learning from how I use the dashboard. Change it anytime in Settings ▸ Sign-in and privacy.</span>
      </label>
      <div className="mt-4 flex flex-col gap-1.5">
        <Button type="primary" block loading={busy === "save"} disabled={busy === "plain"} onClick={() => signOut(true)}>
          Save and sign out
        </Button>
        <Button type="text" block loading={busy === "plain"} disabled={busy === "save"} onClick={() => signOut(false)}>
          Just sign out
        </Button>
      </div>
    </Modal>
  );
}

/** The login page's "Continue as …" for a device with a saved login. */
export function ContinueAs({ known, onSignedIn, onForget }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  async function go() {
    setBusy("go");
    setError(null);
    try {
      await apiFetch("/api/auth/remembered", { method: "POST" });
      onSignedIn();
    } catch (err) {
      setError(err.message);
      onForget();
    } finally {
      setBusy(null);
    }
  }
  async function forget() {
    setBusy("forget");
    await apiFetch("/api/auth/remembered/forget", { method: "POST" }).catch(() => {});
    setBusy(null);
    onForget();
  }
  return (
    <div className="mb-5 rounded-lg border border-line p-4">
      <p className="m-0 text-[13px] text-ink-muted">Saved on this device</p>
      <p className="m-0 mt-0.5 text-[15px] font-medium text-ink">{known.name || known.email}</p>
      {known.name && <p className="m-0 text-[13px] text-ink-muted">{known.email}</p>}
      {error && <p className="m-0 mt-2 text-[13px] text-red-600">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="primary" loading={busy === "go"} onClick={go}>
          Continue as {String(known.name || "you").split(" ")[0]}
        </Button>
        <Button type="text" loading={busy === "forget"} onClick={forget}>
          Use another account
        </Button>
      </div>
    </div>
  );
}
