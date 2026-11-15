"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, App, Button, Input, Modal, Tag, Upload } from "antd";
import { FileCheck2, FileUp, Lock, ShieldCheck } from "lucide-react";
import { apiFetch, apiUpload } from "@/lib/api";

/** The GST certificate: a PDF or a photo, kept private (only Oyklane can
 * open it — it doesn't go in the store's media library). */
function GstFile({ value, onChange }) {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(value ? "Certificate uploaded" : "");
  return (
    <Upload.Dragger
      accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
      multiple={false}
      showUploadList={false}
      disabled={busy}
      customRequest={async ({ file, onSuccess, onError }) => {
        setBusy(true);
        try {
          const r = await apiUpload("/api/trust/gst/doc", file);
          setName(r.name);
          onChange(r.docUrl);
          onSuccess(r);
        } catch (err) {
          message.error(err.message);
          onError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="m-0 flex justify-center text-ink-muted">{name ? <FileCheck2 size={22} /> : <FileUp size={22} />}</p>
      <p className="m-0 mt-2 text-[14px] text-ink">{busy ? "Uploading…" : name || "Drop your GST certificate here, or click to upload"}</p>
      <p className="m-0 mt-1 text-[12px] text-ink-muted">{name ? "Click or drop another file to replace it." : "PDF, or a clear photo (JPG, PNG, WebP) of your GST registration certificate (REG-06). Up to 5MB. Only Oyklane sees it."}</p>
    </Upload.Dragger>
  );
}

/** Verified details are locked; a change goes to Oyklane as a ticket. */
function VerifiedLocked({ code, legalName }) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#B7E4C7] bg-[#F3FBF6] px-4 py-3 text-[13px]">
      <ShieldCheck size={18} className="text-status-success" aria-hidden="true" />
      <span className="text-ink">
        <b className="font-medium">{code}</b> · {legalName}
      </span>
      <Tag color="green" className="!m-0">Verified</Tag>
      <span className="inline-flex items-center gap-1 text-ink-muted">
        <Lock size={12} aria-hidden="true" /> Locked
      </span>
      <Button size="small" className="ml-auto" onClick={() => setOpen(true)}>
        Request a change
      </Button>
      <Modal
        open={open}
        title="Request a GST change"
        okText="Send request"
        confirmLoading={busy}
        okButtonProps={{ disabled: why.trim().length < 5 }}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          setBusy(true);
          try {
            await apiFetch("/api/trust/gst/change-request", { method: "POST", body: { reason: why } });
            message.success("Request sent — Oyklane will reply in Help ▸ Support tickets");
            setOpen(false);
            setWhy("");
          } catch (err) {
            message.error(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="mt-0 text-[13.5px] text-ink-muted">Verified GST details can't be edited directly, so buyers can trust them. Tell us what needs to change — Oyklane checks it and unlocks the details for you.</p>
        <Input.TextArea rows={4} maxLength={2000} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="e.g. Our business became a private limited company — new GSTIN 27AAPFU0939F1ZV, legal name …" />
      </Modal>
    </div>
  );
}

/**
 * GST verification for the Verified seller tick, from the one set of GST
 * details the store keeps (Plan & billing ▸ Billing details). Shown under
 * those details, and on Trust & badge with a link back to edit them.
 *
 * `gstin`, `legalName`: the billing details. `verification`: from
 * /api/trust. `beforeSend`: saves the billing details first (billing page).
 * `editHref`: where to change the details (Trust page).
 */
export function GstVerify({ gstin, legalName, verification, onDone, beforeSend, editHref }) {
  const { message } = App.useApp();
  const [docUrl, setDocUrl] = useState(verification?.gstDocUrl || "");
  const [busy, setBusy] = useState(false);
  const v = verification || { gstStatus: "none" };
  const code = String(gstin || "").trim().toUpperCase();
  const same = code && v.gstin && code === String(v.gstin).toUpperCase();
  const status = same ? v.gstStatus : "none";

  const edit = editHref ? (
    <Link href={editHref} className="text-[13px] text-ink underline underline-offset-2">
      Change in Plan &amp; billing
    </Link>
  ) : null;

  if (!code) {
    return (
      <div className="rounded-xl border border-dashed border-app-border bg-app-bg px-4 py-3 text-[13px] text-ink-muted">
        Add your GSTIN {editHref ? "in Plan & billing ▸ Billing details" : "above"} to get the <b className="font-medium text-ink">Verified seller</b> tick on your store.
        {editHref && (
          <div className="mt-2">
            <Link href={editHref}>
              <Button size="small">Add GST details</Button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (status === "verified") return <VerifiedLocked code={code} legalName={v.legalName || legalName} />;

  if (status === "pending") {
    return (
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-3 text-[13px] ${status === "verified" ? "border-[#B7E4C7] bg-[#F3FBF6]" : "border-[#FDE68A] bg-[#FFFBEB]"}`}>
        <ShieldCheck size={18} className={status === "verified" ? "text-status-success" : "text-[#B45309]"} aria-hidden="true" />
        <span className="text-ink">
          <b className="font-medium">{code}</b> · {v.legalName || legalName}
        </span>
        {status === "verified" ? <Tag color="green" className="!m-0">Verified</Tag> : <Tag color="gold" className="!m-0">Oyklane is checking</Tag>}
        {status === "pending" && <span className="text-ink-muted">Usually done within 1–2 working days.</span>}
        {edit && <span className="ml-auto">{edit}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-app-border px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-[13.5px] text-ink">
          <ShieldCheck size={15} className="mr-1.5 inline -translate-y-px text-ink-muted" aria-hidden="true" />
          Verify <b className="font-medium">{code}</b> for the <b className="font-medium">Verified seller</b> tick
        </p>
        {edit}
      </div>
      {v.gstStatus === "rejected" && same && <Alert type="error" showIcon message="Oyklane couldn't verify these GST details" description={v.gstNote} />}
      {v.gstin && !same && v.gstStatus === "verified" && <Alert type="info" showIcon message={`Your GSTIN changed from ${v.gstin} — verify the new one to keep the Verified tick.`} />}
      <GstFile value={docUrl} onChange={setDocUrl} />
      <p className="m-0 text-[12px] text-ink-muted">Own more than one store? Use the same GSTIN — once it's checked on one store, the others are verified straight away, without the file.</p>
      <div>
        <Button
          type="primary"
          loading={busy}
          disabled={code.length !== 15 || !legalName}
          onClick={async () => {
            setBusy(true);
            try {
              if (beforeSend) await beforeSend();
              const r = await apiFetch("/api/trust/gst", { method: "POST", body: { gstin: code, legalName, docUrl } });
              message.success(r?.verification?.gstStatus === "verified" ? "GST verified" : "Sent to Oyklane for checking");
              onDone?.(r);
            } catch (err) {
              message.error(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Send for verification
        </Button>
        {!legalName && <span className="ml-3 text-[12px] text-ink-muted">Add the legal business name first.</span>}
      </div>
    </div>
  );
}
