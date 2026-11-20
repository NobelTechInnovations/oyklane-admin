"use client";

import { useState } from "react";
import { Button, Checkbox, Modal } from "antd";
import { apiFetch } from "@/lib/api";

/**
 * Signing out: "Save your login on this device?" (API remember/service.js).
 * Saved, the next sign-in here is one click, no password, for 30 days.
 * `open` shows it; `onDone` runs after the session ends.
 */
export function SaveLoginPrompt({ open, onClose, onDone }) {
  const [track, setTrack] = useState(false);
  const [busy, setBusy] = useState(null);
  async function signOut(remember) {
    setBusy(remember ? "save" : "plain");
    await apiFetch("/api/auth/logout", { method: "POST", body: { remember, track: remember && track } }).catch(() => {});
    setBusy(null);
    onDone();
  }
  return (
    <Modal
      open={open}
      title="Save your login on this device?"
      onCancel={onClose}
      footer={[
        <Button key="plain" loading={busy === "plain"} onClick={() => signOut(false)}>
          Just sign out
        </Button>,
        <Button key="save" type="primary" loading={busy === "save"} onClick={() => signOut(true)}>
          Save and sign out
        </Button>,
      ]}
    >
      <div className="flex flex-col gap-3 text-[13px]">
        <p className="m-0 text-ink-muted">Next time you open your dashboard here, continue in one click, without your password. Only on this device, for 30 days. Don&apos;t save it on a shared computer.</p>
        <Checkbox checked={track} onChange={(e) => setTrack(e.target.checked)}>
          Help improve Oyklane: let it learn from how I use the dashboard. You can turn this off in Settings ▸ Sign-in and privacy.
        </Checkbox>
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
