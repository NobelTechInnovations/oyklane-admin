"use client";

import { useCallback, useEffect, useState } from "react";
import { App, Button, Input, Segmented, Skeleton, Table, Tag } from "antd";
import { ExternalLink, RefreshCw, Send } from "lucide-react";
import { apiFetch } from "@/lib/api";

const when = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—");

/** Apps ▸ Facebook Pixel ▸ Events: Meta's own counts for the store's pixel
 * (what Events Manager shows), which events Oyklane sends, and a test
 * event for Events Manager ▸ Test events. */
export function PixelEvents() {
  const { message } = App.useApp();
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [testing, setTesting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch(`/api/apps/facebook-pixel/events?days=${days}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [days]);
  useEffect(load, [load]);

  async function sendTest() {
    setTesting(true);
    try {
      const r = await apiFetch("/api/apps/facebook-pixel/test-event", { method: "POST", body: { code } });
      message.success(r.received ? "Test event sent — it shows in Events Manager ▸ Test events within a minute" : "Sent, but Meta didn't confirm it. Check the code and try again.");
    } catch (err) {
      message.error(err.message);
    } finally {
      setTesting(false);
    }
  }

  if (!data && !error) return <Skeleton active paragraph={{ rows: 4 }} />;
  if (error) return <p className="m-0 text-[13px] text-status-danger">{error}</p>;
  if (!data.pixelId) return <p className="m-0 text-[13px] text-ink-muted">Choose your pixel above and save — its events show here.</p>;
  if (!data.connected) return <p className="m-0 text-[13px] text-ink-muted">Continue with Facebook above to see what Meta receives from your store.</p>;

  const dayKeys = Array.from({ length: Math.min(days, 7) }, (_, i) => new Date(Date.now() - (Math.min(days, 7) - 1 - i) * 86400e3).toISOString().slice(0, 10));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-[13px] text-ink-muted">
          What Meta received for pixel <span className="tabular-nums text-ink">{data.pixelId}</span> — the same numbers as Events Manager.
        </p>
        <div className="flex items-center gap-2">
          <Segmented size="small" value={days} onChange={setDays} options={[{ value: 1, label: "Today" }, { value: 7, label: "7 days" }, { value: 28, label: "28 days" }]} />
          <Button size="small" icon={<RefreshCw size={13} aria-hidden="true" />} loading={loading} onClick={load} aria-label="Refresh" />
        </div>
      </div>
      <Table
        rowKey="name"
        size="small"
        pagination={false}
        scroll={{ x: "max-content" }}
        dataSource={data.events}
        columns={[
          {
            title: "Event",
            render: (_, e) => (
              <span className="flex flex-col">
                <span className="text-[13px] font-medium text-ink">{e.name}</span>
                {e.ours && <span className="text-[11.5px] text-ink-muted">{e.ours.what}</span>}
              </span>
            ),
          },
          { title: "Sent from", render: (_, e) => (e.ours ? <Tag className="!m-0">{e.ours.where}</Tag> : <span className="text-[12px] text-ink-muted">Other source</span>) },
          { title: "Status", render: (_, e) => (e.total > 0 ? <Tag color="green" className="!m-0">Received</Tag> : <Tag className="!m-0">None yet</Tag>) },
          { title: `Last ${days === 1 ? "24 hours" : `${days} days`}`, align: "right", render: (_, e) => <span className="tabular-nums font-semibold">{e.total.toLocaleString("en-IN")}</span> },
          {
            title: "By day",
            render: (_, e) => {
              const max = Math.max(1, ...dayKeys.map((d) => e.byDay[d] || 0));
              return (
                <span className="flex h-6 items-end gap-[3px]" aria-label={dayKeys.map((d) => `${d}: ${e.byDay[d] || 0}`).join(", ")}>
                  {dayKeys.map((d) => (
                    <span key={d} title={`${d}: ${e.byDay[d] || 0}`} className="w-2 rounded-sm bg-[#1F5FD6]" style={{ height: `${Math.max(2, ((e.byDay[d] || 0) / max) * 24)}px`, opacity: e.byDay[d] ? 1 : 0.2 }} />
                  ))}
                </span>
              );
            },
          },
          { title: "Last received", render: (_, e) => <span className="text-[12.5px] text-ink-muted tabular-nums">{when(e.last)}</span> },
        ]}
      />
      <div className="rounded-lg bg-app-bg px-3 py-3">
        <p className="m-0 text-[13px] font-medium text-ink">Send a test event</p>
        <p className="m-0 mt-0.5 text-[12.5px] text-ink-muted">
          In Events Manager open your pixel ▸ Test events, copy the test code and paste it here. A PageView from Oyklane&apos;s server shows up there.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="TEST12345" className="!w-[200px]" onPressEnter={() => code && sendTest()} aria-label="Test event code" />
          <Button icon={<Send size={13} aria-hidden="true" />} loading={testing} disabled={!code.trim()} onClick={sendTest}>
            Send test event
          </Button>
          <a href={`https://business.facebook.com/events_manager2/list/pixel/${data.pixelId}/test_events`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px]">
            Open Events Manager <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
