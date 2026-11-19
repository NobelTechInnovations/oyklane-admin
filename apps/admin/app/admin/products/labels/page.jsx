"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { App, Button, Card, InputNumber, Segmented, Select, Switch, Table } from "antd";
import { Printer, Trash2 } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";

const SIZES = {
  "50x25": { label: "50 × 25 mm roll", page: "50mm 25mm", w: "50mm", h: "25mm", sheet: false },
  "38x25": { label: "38 × 25 mm roll", page: "38mm 25mm", w: "38mm", h: "25mm", sheet: false },
  a4: { label: "A4 sheet, 3 × 8", page: "A4", w: "64mm", h: "33.9mm", sheet: true },
};

function Code({ value }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, String(value), { format: "CODE128", height: 34, width: 1.4, margin: 0, displayValue: true, fontSize: 10, textMargin: 1, font: "monospace" });
      } catch {
        /* a value the barcode can't hold: the SKU text still prints */
      }
    }
  }, [value]);
  return <svg ref={ref} className="max-h-[60%] max-w-full" />;
}

/** Products ▸ Barcode labels: the SKU as a barcode the point of sale scans, with name and price. */
export default function LabelsPage() {
  const { message, modal } = App.useApp();
  const [items, setItems] = useState([]);
  const [options, setOptions] = useState([]);
  const [size, setSize] = useState("50x25");
  const [showPrice, setShowPrice] = useState(true);
  const [labels, setLabels] = useState(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    const po = new URLSearchParams(window.location.search).get("po");
    if (po)
      apiFetch(`/api/purchase-orders/${po}`)
        .then((d) => setItems(d.purchaseOrder.items.filter((i) => i.received > 0).map((i) => ({ variantId: i.variantId, title: i.title, copies: i.received }))))
        .catch((err) => message.error(err.message));
  }, [message]);

  const search = (q) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const d = await apiFetch(`/api/pos/products?q=${encodeURIComponent(q || "")}`).catch(() => ({ products: [] }));
      setOptions((d.products || []).map((p) => ({ value: p.variantId, label: `${p.title}${p.sku ? ` · ${p.sku}` : " · no SKU yet"}`, title: p.title })));
    }, 250);
  };

  async function make(assignSkus = false) {
    setBusy(true);
    try {
      const d = await apiFetch("/api/purchase-orders/labels", { method: "POST", body: { items: items.map((i) => ({ variantId: i.variantId, copies: i.copies })), assignSkus } });
      if (d.missingSku > 0 && !assignSkus) {
        modal.confirm({
          title: `${d.missingSku} product${d.missingSku === 1 ? " has" : "s have"} no SKU`,
          content: "A barcode needs one. Give them a SKU now? It's saved on the product, and the point of sale scans it.",
          okText: "Give them a SKU",
          onOk: () => make(true),
        });
        setLabels(d.labels.filter((l) => l.sku));
      } else setLabels(d.labels);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const s = SIZES[size];
  const sheet = (labels || []).flatMap((l) => Array.from({ length: l.copies }, (_, k) => ({ ...l, key: `${l.variantId}-${k}` })));

  return (
    <div>
      <PageHeader title="Barcode labels" subtitle="Print labels with each product's SKU as a barcode, for your shelves and the point of sale." backHref="/admin/products/purchase-orders" />
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card size="small" title="Products" styles={{ body: { padding: 0 } }}>
          <div className="border-b border-line p-3">
            <Select
              showSearch
              filterOption={false}
              value={null}
              onSearch={search}
              onFocus={() => !options.length && search("")}
              onSelect={(variantId, o) => setItems((list) => (list.some((i) => i.variantId === variantId) ? list : [...list, { variantId, title: o.title, copies: 1 }]))}
              options={options}
              placeholder="Search products to add"
              className="!w-full"
            />
          </div>
          <Table
            rowKey="variantId"
            size="small"
            pagination={false}
            dataSource={items}
            locale={{ emptyText: "Add products, or open this from a received purchase order" }}
            columns={[
              { title: "Product", dataIndex: "title" },
              { title: "Labels", width: 110, render: (_, i, k) => <InputNumber size="small" min={1} max={500} value={i.copies} onChange={(copies) => setItems(items.map((x, j) => (j === k ? { ...x, copies: copies ?? 1 } : x)))} className="!w-20" /> },
              { title: "", width: 44, render: (_, i, k) => <Button size="small" type="text" danger icon={<Trash2 size={13} />} aria-label="Remove" onClick={() => setItems(items.filter((_, j) => j !== k))} /> },
            ]}
          />
        </Card>
        <Card size="small" title="Label">
          <div className="flex flex-col gap-3 text-[13px]">
            <Segmented block value={size} onChange={setSize} options={Object.entries(SIZES).map(([value, x]) => ({ value, label: x.label }))} />
            <label className="flex items-center justify-between">
              <span>Show the price</span>
              <Switch size="small" checked={showPrice} onChange={setShowPrice} />
            </label>
            <Button type="primary" loading={busy} disabled={!items.length} onClick={() => make(false)}>
              Make labels
            </Button>
            {labels && (
              <Button icon={<Printer size={14} />} disabled={!sheet.length} onClick={() => window.print()}>
                Print {sheet.length} label{sheet.length === 1 ? "" : "s"}
              </Button>
            )}
          </div>
        </Card>
      </div>

      {labels && (
        <Card size="small" title="Preview" className="mt-4">
          <div id="oy-labels" className={s.sheet ? "grid grid-cols-3 gap-0" : "flex flex-wrap gap-2"}>
            {sheet.map((l) => (
              <div key={l.key} className="oy-label flex flex-col items-center justify-between overflow-hidden border border-dashed border-line bg-white p-[1.5mm] text-center text-black" style={{ width: s.w, height: s.h }}>
                <span className="line-clamp-1 w-full text-[8pt] font-semibold leading-tight">{l.product}</span>
                {(l.variant || showPrice) && <span className="w-full truncate text-[7pt] leading-tight">{[l.variant, showPrice ? l.price : null].filter(Boolean).join(" · ")}</span>}
                <Code value={l.sku} />
              </div>
            ))}
          </div>
        </Card>
      )}
      <style>{`@media print{@page{size:${s.page};margin:${s.sheet ? "13mm 7mm" : "0"}}body *{visibility:hidden}#oy-labels,#oy-labels *{visibility:visible}#oy-labels{position:fixed;top:0;left:0;gap:0!important}.oy-label{border:0!important;break-inside:avoid;page-break-inside:avoid}${s.sheet ? "" : ".oy-label{page-break-after:always}"}}`}</style>
    </div>
  );
}
