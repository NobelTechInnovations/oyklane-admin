"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { App, Button, Card, InputNumber, Popconfirm, Progress, Select } from "antd";
import { FileDown, Trash2, UploadCloud } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";

const human = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** PUT or POST with upload progress (fetch can't report it). */
function send({ method, url, headers = {}, body, withCredentials }, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.withCredentials = Boolean(withCredentials);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* not JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data?.error || "Upload failed. Please try again."));
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.send(body);
  });
}

/**
 * Product form ▸ Digital product (API products/digital.js): files sold with
 * the product. Buyers get a download link for each once their order is
 * paid; a product with files needs no shipping.
 */
export function DigitalFilesCard({ productId, variants = [] }) {
  const { message } = App.useApp();
  const [files, setFiles] = useState(null);
  const [progress, setProgress] = useState(null);
  const input = useRef(null);
  const load = useCallback(() => {
    if (!productId) return;
    apiFetch(`/api/products/${productId}/digital`)
      .then((d) => setFiles(d.files))
      .catch(() => setFiles([]));
  }, [productId]);
  useEffect(() => {
    load();
  }, [load]);

  async function upload(file) {
    if (!file) return;
    setProgress(0);
    try {
      const plan = await apiFetch(`/api/products/${productId}/digital/sign`, { method: "POST", body: { fileName: file.name, mime: file.type || "application/octet-stream", size: file.size } });
      if (plan.method === "PUT") {
        await send({ method: "PUT", url: plan.uploadUrl, headers: plan.headers, body: file }, setProgress);
        await apiFetch(`/api/products/${productId}/digital/complete`, { method: "POST", body: { key: plan.key, fileName: file.name } });
      } else {
        if (file.size > plan.maxBytes) throw new Error(`Files can be up to ${human(plan.maxBytes)} here.`);
        const form = new FormData();
        form.append("downloadLimit", "5");
        form.append("expiryDays", "30");
        form.append("file", file);
        await send({ method: "POST", url: `${API_URL}/api/products/${productId}/digital`, body: form, withCredentials: true }, setProgress);
      }
      message.success(`${file.name} added`);
      load();
    } catch (err) {
      message.error(err.message);
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }

  async function change(file, patch) {
    try {
      const { file: saved } = await apiFetch(`/api/products/digital/${file.id}`, { method: "PATCH", body: { downloadLimit: file.downloadLimit, expiryDays: file.expiryDays, ...patch } });
      setFiles((list) => list.map((f) => (f.id === saved.id ? saved : f)));
    } catch (err) {
      message.error(err.message);
    }
  }

  async function remove(file) {
    try {
      await apiFetch(`/api/products/digital/${file.id}`, { method: "DELETE" });
      setFiles((list) => list.filter((f) => f.id !== file.id));
    } catch (err) {
      message.error(err.message);
    }
  }

  return (
    <Card size="small" title="Digital product">
      <p className="m-0 text-[13px] text-ink-muted">Sell a file with this product: an e-book, course, music or template. Buyers get a download link once their order is paid, and nothing is shipped.</p>
      {!productId ? (
        <p className="m-0 mt-2 text-[13px] text-ink-muted">Save the product first, then add its files.</p>
      ) : (
        <>
          {files?.length > 0 && (
            <ul className="m-0 mt-3 flex list-none flex-col divide-y divide-app-border rounded-md border border-app-border p-0">
              {files.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <FileDown size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                  <span className="min-w-0 flex-1 basis-40">
                    <span className="block truncate text-[13px] font-medium">{f.fileName}</span>
                    <span className="block text-[12px] text-ink-muted">{human(f.size)}</span>
                  </span>
                  {variants.length > 1 && (
                    <Select size="small" value={f.variantId || "all"} onChange={(v) => change(f, { variantId: v === "all" ? null : v })} options={[{ value: "all", label: "All variants" }, ...variants.filter((v) => v.id).map((v) => ({ value: v.id, label: v.title }))]} style={{ width: 150 }} aria-label="Which variant includes it" />
                  )}
                  <InputNumber size="small" min={0} max={1000} value={f.downloadLimit} onChange={(v) => setFiles((list) => list.map((x) => (x.id === f.id ? { ...x, downloadLimit: v } : x)))} onBlur={() => change(f, {})} addonAfter="downloads" style={{ width: 150 }} aria-label="Downloads allowed (0: no limit)" />
                  <InputNumber size="small" min={0} max={3650} value={f.expiryDays} onChange={(v) => setFiles((list) => list.map((x) => (x.id === f.id ? { ...x, expiryDays: v } : x)))} onBlur={() => change(f, {})} addonAfter="days" style={{ width: 120 }} aria-label="Days the link works (0: always)" />
                  <Popconfirm title="Remove this file?" description="Links already sent for it stop working." onConfirm={() => remove(f)}>
                    <Button size="small" type="text" danger icon={<Trash2 size={13} aria-hidden="true" />} aria-label={`Remove ${f.fileName}`} />
                  </Popconfirm>
                </li>
              ))}
            </ul>
          )}
          {progress !== null && <Progress className="!mt-3" percent={progress} size="small" />}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input ref={input} type="file" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            <Button icon={<UploadCloud size={14} aria-hidden="true" />} loading={progress !== null} onClick={() => input.current?.click()}>
              Add a file
            </Button>
            <span className="text-[12px] text-ink-muted">0 downloads or days means no limit. Changes apply to new orders.</span>
          </div>
        </>
      )}
    </Card>
  );
}
