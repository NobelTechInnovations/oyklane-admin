"use client";

import { useEffect, useState } from "react";
import { App, Button, Card } from "antd";
import { apiFetch } from "@/lib/api";

/** Order page ▸ Downloads: the buyer's links for digital products, and sending them again. */
export function DownloadsCard({ orderId, paid }) {
  const { message } = App.useApp();
  const [links, setLinks] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    apiFetch(`/api/orders/${orderId}/downloads`)
      .then((d) => setLinks(d.downloads))
      .catch(() => setLinks([]));
  }, [orderId]);
  if (!links?.length) return null;

  async function resend() {
    setBusy(true);
    try {
      const r = await apiFetch(`/api/orders/${orderId}/downloads/resend`, { method: "POST", body: {} });
      setLinks(r.links);
      message.success("Download links emailed");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      size="small"
      title="Downloads"
      extra={
        paid && (
          <Button size="small" loading={busy} onClick={resend}>
            Email links again
          </Button>
        )
      }
    >
      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[13px]">
        {links.map((l) => (
          <li key={l.id} className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate font-medium">{l.fileName}</span>
              <span className="block text-[12px] text-ink-muted">
                {l.downloads} of {l.limit || "unlimited"} downloads used
                {l.expiresAt ? ` · ${l.expired ? "expired" : "works until"} ${new Date(l.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                {!l.available ? " · file removed" : ""}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
