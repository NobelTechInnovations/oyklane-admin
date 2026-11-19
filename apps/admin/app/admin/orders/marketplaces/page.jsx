"use client";

import { useState } from "react";
import { Alert, App, Button, Card, Segmented, Upload } from "antd";
import { Download, Upload as UploadIcon } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { API_URL, apiFetch } from "@/lib/api";

const MARKETS = [
  { value: "amazon", label: "Amazon" },
  { value: "flipkart", label: "Flipkart" },
  { value: "meesho", label: "Meesho" },
];

/** Orders ▸ Marketplaces: list on Amazon, Flipkart and Meesho, and bring their orders in so one stock count serves all. */
export default function MarketplacesPage() {
  const { message } = App.useApp();
  const [market, setMarket] = useState("amazon");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const name = MARKETS.find((m) => m.value === market)?.label;

  async function importFile(file) {
    setBusy(true);
    setResult(null);
    try {
      const csv = await file.text();
      const r = await apiFetch(`/api/marketplaces/${market}/orders`, { method: "POST", body: { csv } });
      setResult(r);
      message.success(`${r.created} ${name} order${r.created === 1 ? "" : "s"} added`);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
    return false;
  }

  return (
    <div>
      <PageHeader title="Marketplaces" subtitle="Sell on Amazon, Flipkart and Meesho from one catalogue and one stock count." />
      <Segmented value={market} onChange={(m) => (setMarket(m), setResult(null))} options={MARKETS} className="!mb-4" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card size="small" title={`1. List your products on ${name}`}>
          <p className="m-0 mb-3 text-[13px] text-ink-muted">
            Download your products as {name}&apos;s bulk-listing sheet (SKU, title, prices, stock, images, HSN and GST), then upload it in {name}&apos;s seller panel. Products need a SKU.
          </p>
          <a href={`${API_URL}/api/marketplaces/${market}/listings.csv`} target="_blank" rel="noreferrer">
            <Button icon={<Download size={14} />}>Download {name} listing sheet</Button>
          </a>
        </Card>
        <Card size="small" title={`2. Bring ${name} orders in`}>
          <p className="m-0 mb-3 text-[13px] text-ink-muted">Download the order report from {name} as CSV and add it here. Each order comes in once, matched by SKU, and its stock comes off here, so you don&apos;t sell the same item twice.</p>
          <Upload accept=".csv,text/csv" showUploadList={false} beforeUpload={importFile}>
            <Button icon={<UploadIcon size={14} />} loading={busy}>
              Add {name} order report
            </Button>
          </Upload>
          {result && (
            <Alert
              className="!mt-3"
              type={result.unknownSkus?.length ? "warning" : "success"}
              showIcon
              message={`${result.created} added, ${result.skipped} already here`}
              description={result.unknownSkus?.length ? `SKUs not in your store (skipped): ${result.unknownSkus.join(", ")}` : null}
            />
          )}
        </Card>
      </div>
      <p className="mt-4 text-[12px] text-ink-muted">Live two-way sync needs your developer access on each marketplace (Amazon SP-API, Flipkart Seller API). Meesho has no public API, so its sheets are the way in.</p>
    </div>
  );
}
