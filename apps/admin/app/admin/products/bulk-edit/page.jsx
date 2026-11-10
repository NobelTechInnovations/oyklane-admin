"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { App, Button, Checkbox, Dropdown, Input, InputNumber, Popover, Select, Skeleton, Tag } from "antd";
import { Columns3, Save, ArrowDownToLine } from "lucide-react";
import { PageHeader, Thumb } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";

// The columns the editor can show: product-level ones on each product's
// first row, variant ones on every row.
const COLUMNS = [
  { key: "title", label: "Product name", level: "product", type: "text", width: 260, always: true },
  { key: "status", label: "Status", level: "product", type: "status", width: 120 },
  { key: "price", label: "Price (₹)", level: "variant", type: "money", width: 110 },
  { key: "comparePrice", label: "Compare-at (₹)", level: "variant", type: "money", width: 125 },
  { key: "inventoryQuantity", label: "Stock", level: "variant", type: "int", width: 95 },
  { key: "sku", label: "SKU", level: "variant", type: "text", width: 140 },
  { key: "cost", label: "Cost (₹)", level: "variant", type: "money", width: 105, off: true },
  { key: "weight", label: "Weight (kg)", level: "variant", type: "num", width: 105, off: true },
  { key: "vendor", label: "Vendor", level: "product", type: "text", width: 150, off: true },
  { key: "productType", label: "Type", level: "product", type: "text", width: 150, off: true },
  { key: "tags", label: "Tags", level: "product", type: "text", width: 200, off: true },
  { key: "hsnCode", label: "HSN", level: "product", type: "text", width: 100, off: true },
];
const STATUS = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

function Cell({ col, value, onChange, changed }) {
  const cls = `w-full ${changed ? "!bg-[#FFF8E6] !border-[#E9B949]" : ""}`;
  if (col.type === "status") return <Select size="small" className={cls} value={value} options={STATUS} onChange={onChange} popupMatchSelectWidth={false} />;
  if (col.type === "money" || col.type === "num" || col.type === "int")
    return <InputNumber size="small" className={cls} value={value} min={col.type === "int" ? undefined : 0} precision={col.type === "int" ? 0 : col.type === "money" ? 2 : 3} controls={false} onChange={(v) => onChange(v)} />;
  return <Input size="small" className={cls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
}

function Editor() {
  const params = useSearchParams();
  const { message, modal } = App.useApp();
  const ids = (params.get("ids") || "").split(",").filter(Boolean);
  const [rows, setRows] = useState(null); // products as loaded
  const [edits, setEdits] = useState({}); // "p:<id>:<key>" / "v:<id>:<key>" → value
  const [shown, setShown] = useState(COLUMNS.filter((c) => !c.off).map((c) => c.key));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ids.length) return setRows([]);
    apiFetch(`/api/products/bulk-edit?ids=${ids.join(",")}`)
      .then((d) => setRows(d.products))
      .catch((err) => {
        message.error(err.message);
        setRows([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cols = COLUMNS.filter((c) => c.always || shown.includes(c.key));
  // One table row per variant; product fields on the first one.
  const lines = useMemo(
    () => (rows || []).flatMap((p) => p.variants.map((v, i) => ({ p, v, first: i === 0, count: p.variants.length }))),
    [rows]
  );
  const keyOf = (col, line) => (col.level === "product" ? `p:${line.p.id}:${col.key}` : `v:${line.v.id}:${col.key}`);
  const original = (col, line) => (col.level === "product" ? line.p[col.key] : line.v[col.key]);
  const valueOf = (col, line) => {
    const k = keyOf(col, line);
    return k in edits ? edits[k] : original(col, line);
  };
  const set = (col, line, value) =>
    setEdits((e) => {
      const k = keyOf(col, line);
      const next = { ...e };
      if (value === original(col, line) || (value === "" && original(col, line) == null)) delete next[k];
      else next[k] = value;
      return next;
    });
  const changes = Object.keys(edits).length;

  /** The first row's value, copied to every row of this column. */
  function fillDown(col) {
    const first = lines[0];
    if (!first) return;
    const value = valueOf(col, first);
    const targets = col.level === "product" ? lines.filter((l) => l.first) : lines;
    setEdits((e) => {
      const next = { ...e };
      for (const l of targets) {
        const k = keyOf(col, l);
        if (value === original(col, l)) delete next[k];
        else next[k] = value;
      }
      return next;
    });
  }

  async function save() {
    const byProduct = new Map();
    for (const [k, value] of Object.entries(edits)) {
      const [level, id, field] = k.split(":");
      if (level === "p") {
        const row = byProduct.get(id) || { id, variants: [] };
        row[field] = value;
        byProduct.set(id, row);
      } else {
        const line = lines.find((l) => l.v.id === id);
        const row = byProduct.get(line.p.id) || { id: line.p.id, variants: [] };
        let v = row.variants.find((x) => x.id === id);
        if (!v) row.variants.push((v = { id }));
        v[field] = value;
        // The API checks compare-at against the price, so send both.
        if (field === "comparePrice" && v.price === undefined) v.price = valueOf(COLUMNS.find((c) => c.key === "price"), line);
        byProduct.set(line.p.id, row);
      }
    }
    setSaving(true);
    try {
      const r = await apiFetch("/api/products/bulk-edit", { method: "PUT", body: { products: [...byProduct.values()] } });
      message.success(`Saved — ${r.products} product${r.products === 1 ? "" : "s"}, ${r.variants} variant${r.variants === 1 ? "" : "s"}`);
      setEdits({});
      const d = await apiFetch(`/api/products/bulk-edit?ids=${ids.join(",")}`);
      setRows(d.products);
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function leave() {
    modal.confirm({ title: "Discard your changes?", content: `${changes} change${changes === 1 ? "" : "s"} will be lost.`, okText: "Discard", okButtonProps: { danger: true }, onOk: () => setEdits({}) });
  }
  // Closing the tab with unsaved changes asks first.
  useEffect(() => {
    if (!changes) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changes]);

  if (!rows) return <Skeleton active paragraph={{ rows: 8 }} />;
  return (
    <div>
      <PageHeader
        title={`Bulk edit · ${rows.length} product${rows.length === 1 ? "" : "s"}`}
        backHref="/admin/products"
        actions={
          <>
            {changes > 0 && <Button onClick={leave}>Discard</Button>}
            <Popover
              trigger="click"
              placement="bottomRight"
              content={
                <Checkbox.Group className="flex flex-col gap-1.5" value={shown} onChange={setShown} options={COLUMNS.filter((c) => !c.always).map((c) => ({ value: c.key, label: c.label }))} />
              }
            >
              <Button icon={<Columns3 size={14} aria-hidden="true" />}>Columns</Button>
            </Popover>
            <Button type="primary" icon={<Save size={14} aria-hidden="true" />} disabled={!changes} loading={saving} onClick={save}>
              Save{changes ? ` ${changes} change${changes === 1 ? "" : "s"}` : ""}
            </Button>
          </>
        }
      />
      {!rows.length ? (
        <p className="text-ink-muted">Select products on the Products page, then choose Bulk edit.</p>
      ) : (
        <div className="overflow-auto rounded-[12px] border border-app-border bg-white max-h-[calc(100vh-190px)]">
          <table className="w-max min-w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-[#F7F8FA]">
              <tr>
                <th className="sticky left-0 z-20 bg-[#F7F8FA] border-b border-app-border px-3 py-2 text-left font-medium text-ink-muted w-[64px]" />
                {cols.map((c) => (
                  <th key={c.key} className="border-b border-l border-app-border px-2 py-1.5 text-left font-medium text-ink" style={{ minWidth: c.width }}>
                    <span className="inline-flex w-full items-center justify-between gap-1">
                      {c.label}
                      {lines.length > 1 && (
                        <Dropdown menu={{ items: [{ key: "fill", icon: <ArrowDownToLine size={13} />, label: "Copy the first row to every row" }], onClick: () => fillDown(c) }} trigger={["click"]}>
                          <button type="button" className="rounded px-1 text-ink-muted hover:bg-black/5" aria-label={`${c.label}: fill down`}>
                            ⋯
                          </button>
                        </Dropdown>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.v.id} className={l.first ? "border-t border-app-border" : ""}>
                  <td className="sticky left-0 z-[5] bg-white px-3 py-1.5 align-top">
                    {l.first ? <Thumb src={l.p.image} size={36} /> : <span className="block pl-1 text-[12px] text-ink-muted">↳</span>}
                  </td>
                  {cols.map((c) => (
                    <td key={c.key} className="border-l border-app-border/60 px-1.5 py-1 align-top" style={{ minWidth: c.width }}>
                      {c.level === "product" && !l.first ? null : c.key === "title" ? (
                        <div className="flex flex-col gap-0.5">
                          <Cell col={c} value={valueOf(c, l)} changed={keyOf(c, l) in edits} onChange={(v) => set(c, l, v)} />
                          {l.count > 1 && <Tag className="m-0 self-start" bordered={false}>{l.v.title}</Tag>}
                        </div>
                      ) : (
                        <Cell col={c} value={valueOf(c, l)} changed={keyOf(c, l) in edits} onChange={(v) => set(c, l, v)} />
                      )}
                      {c.key === "title" && !l.first && <span className="block px-1 text-[12.5px] text-ink">{l.v.title}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[12px] text-ink-muted">Changed cells turn yellow. Stock changes are saved in each variant's inventory history as “Bulk edit”. Names change without changing a product&apos;s web address.</p>
    </div>
  );
}

/** Products ▸ Bulk edit — the selected products in one editable table. */
export default function ProductBulkEditPage() {
  return (
    <Suspense fallback={<Skeleton active />}>
      <Editor />
    </Suspense>
  );
}
