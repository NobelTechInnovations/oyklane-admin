"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App, Button, Card, Checkbox, Dropdown, Input, Select, Skeleton, Table } from "antd";
import { BarChart3, Download, FileSpreadsheet, FileText, Package, RotateCcw, ShoppingBag, TicketPercent, TrendingUp, Users, Globe, Boxes } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { AreaChart, formatValue } from "@/components/charts";
import { toCsv, toXlsx, download } from "@/lib/table-export";

const DAY = 86400000;
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const today = () => iso(new Date());
const daysAgo = (n) => iso(new Date(Date.now() - n * DAY));
const monthStart = (back = 0) => {
  const d = new Date();
  return iso(new Date(d.getFullYear(), d.getMonth() - back, 1));
};
const monthEnd = (back) => {
  const d = new Date();
  return iso(new Date(d.getFullYear(), d.getMonth() - back + 1, 0));
};

const DATES = [
  { value: "today", label: "Today", range: () => [today(), today()] },
  { value: "7d", label: "Last 7 days", range: () => [daysAgo(6), today()] },
  { value: "30d", label: "Last 30 days", range: () => [daysAgo(29), today()] },
  { value: "90d", label: "Last 90 days", range: () => [daysAgo(89), today()] },
  { value: "month", label: "This month", range: () => [monthStart(0), today()] },
  { value: "last_month", label: "Last month", range: () => [monthStart(1), monthEnd(1)] },
  { value: "year", label: "Last 12 months", range: () => [daysAgo(364), today()] },
  { value: "custom", label: "Custom dates" },
];

const ICON = { sales: TrendingUp, orders: ShoppingBag, products: Package, customers: Users, traffic: Globe, discounts: TicketPercent, inventory: Boxes };

/** Ready-made starting points; everything stays changeable. */
const PRESETS = [
  { label: "Sales by day", q: { dataset: "sales", groupBy: "day" } },
  { label: "Sales by month", q: { dataset: "sales", groupBy: "month", date: "year" } },
  { label: "Sales by product", q: { dataset: "sales", groupBy: "product" } },
  { label: "Sales by state", q: { dataset: "sales", groupBy: "state" } },
  { label: "COD vs prepaid", q: { dataset: "sales", groupBy: "payment_method" } },
  { label: "All orders", q: { dataset: "orders" } },
  { label: "Unfulfilled orders", q: { dataset: "orders", filters: { fulfillmentStatus: "unfulfilled" } } },
  { label: "Best-selling products", q: { dataset: "products" } },
  { label: "Top customers", q: { dataset: "customers", date: "90d" } },
  { label: "Visits by source", q: { dataset: "traffic", groupBy: "source" } },
  { label: "Discount codes", q: { dataset: "discounts" } },
  { label: "Low stock", q: { dataset: "inventory", filters: { stock: "low" } } },
];

const DEFAULT = { dataset: "sales", groupBy: "day", date: "30d", from: daysAgo(29), to: today(), filters: {} };

const num = { fontVariantNumeric: "tabular-nums" };
const show = (v, type) => {
  if (v === null || v === undefined || v === "") return <span className="text-ink-subtle">—</span>;
  if (type === "currency") return <span style={num}>{formatValue(v, "currency")}</span>;
  if (type === "percent") return <span style={num}>{formatValue(v, "percent")}</span>;
  if (type === "number") return <span style={num}>{Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>;
  if (type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return v;
};

/** Analytics ▸ Reports: build a report — what, grouped how, which dates,
 * which filters — see it, and download it as CSV or Excel. */
export default function ReportsPage() {
  const { message } = App.useApp();
  const [catalog, setCatalog] = useState(null);
  const [q, setQ] = useState(DEFAULT);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const seq = useRef(0);

  useEffect(() => {
    apiFetch("/api/analytics/reports/builder")
      .then(setCatalog)
      .catch((err) => message.error(err.message));
  }, [message]);

  const ds = catalog?.datasets.find((d) => d.key === q.dataset);

  const runReport = useCallback(
    async (query) => {
      const id = ++seq.current;
      setLoading(true);
      try {
        const r = await apiFetch("/api/analytics/reports/run", { method: "POST", body: { dataset: query.dataset, groupBy: query.groupBy, from: query.from, to: query.to, filters: query.filters } });
        if (id === seq.current) setData(r);
      } catch (err) {
        if (id === seq.current) message.error(err.message);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    },
    [message]
  );

  // Runs again whenever the report changes (a beat after typing stops).
  useEffect(() => {
    if (!catalog) return;
    const t = setTimeout(() => runReport(q), 250);
    return () => clearTimeout(t);
  }, [q, catalog, runReport]);

  const set = (patch) => setQ((cur) => ({ ...cur, ...patch }));
  const setFilter = (k, v) => setQ((cur) => ({ ...cur, filters: { ...cur.filters, [k]: v || undefined } }));
  const pickDataset = (key) => {
    const d = catalog.datasets.find((x) => x.key === key);
    setQ((cur) => ({ ...cur, dataset: key, groupBy: d.groups ? d.groups[0].value : undefined, filters: {} }));
    setSearch("");
  };
  const pickDate = (value) => {
    const opt = DATES.find((d) => d.value === value);
    if (opt.range) {
      const [from, to] = opt.range();
      set({ date: value, from, to });
    } else set({ date: value });
  };
  const applyPreset = (p) => {
    const d = catalog.datasets.find((x) => x.key === p.q.dataset);
    const date = p.q.date || q.date;
    const opt = DATES.find((x) => x.value === date);
    const [from, to] = opt?.range ? opt.range() : [q.from, q.to];
    setQ({ dataset: p.q.dataset, groupBy: p.q.groupBy || (d?.groups ? d.groups[0].value : undefined), date, from, to, filters: p.q.filters || {} });
    setSearch("");
  };

  const rows = useMemo(() => {
    if (!data) return [];
    if (!search) return data.rows;
    const s = search.toLowerCase();
    return data.rows.filter((r) => data.columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(s)));
  }, [data, search]);

  const title = ds ? `${ds.label}${ds.groups && q.groupBy ? ` by ${ds.groups.find((g) => g.value === q.groupBy)?.label.toLowerCase()}` : ""}` : "Report";
  const fileName = (ext) => `${title.replace(/[^\w]+/g, "-").toLowerCase()}${ds?.dated ? `_${data?.from}_to_${data?.to}` : `_${today()}`}.${ext}`;

  const columns = (data?.columns || []).map((c, i) => ({
    key: c.key,
    dataIndex: c.key,
    title: c.label,
    align: ["number", "currency", "percent"].includes(c.type) ? "right" : "left",
    fixed: i === 0 ? "left" : undefined,
    ellipsis: c.type === "text" && i === 0 ? { showTitle: true } : false,
    width: i === 0 ? 220 : undefined,
    sorter: (a, b) => (["number", "currency", "percent"].includes(c.type) ? (Number(a[c.key]) || 0) - (Number(b[c.key]) || 0) : String(a[c.key] ?? "").localeCompare(String(b[c.key] ?? ""))),
    render: (v) => show(v, c.type),
  }));

  // Over time (sales or traffic by day, week or month): a line above the table.
  const timeline = data && ["day", "week", "month"].includes(data.groupBy) && ["sales", "traffic"].includes(data.dataset);
  const lineKey = data?.dataset === "traffic" ? "sessions" : "net";
  const headline = data?.columns.filter((c) => data.totals[c.key] !== undefined).slice(0, 5) || [];

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Build the report you need — choose what to see, how to group it, the dates and filters — then download it."
        actions={
          <Dropdown
            disabled={!data?.rows.length}
            menu={{
              items: [
                { key: "xlsx", icon: <FileSpreadsheet size={15} />, label: "Excel (.xlsx)", onClick: () => download(toXlsx(data.columns, rows, title), fileName("xlsx")) },
                { key: "csv", icon: <FileText size={15} />, label: "CSV", onClick: () => download(toCsv(data.columns, rows), fileName("csv")) },
              ],
            }}
          >
            <Button type="primary" icon={<Download size={15} aria-hidden="true" />}>
              Download
            </Button>
          </Dropdown>
        }
      />

      {!catalog ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-[13px] text-ink-muted transition-colors hover:border-[#c9cdd4] hover:text-ink"
              >
                {p.label}
              </button>
            ))}
          </div>

          <Card size="small" className="mb-4" styles={{ body: { padding: 16 } }}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-medium text-ink-muted">Report</span>
                <Select
                  value={q.dataset}
                  onChange={pickDataset}
                  optionLabelProp="label"
                  options={catalog.datasets.map((d) => {
                    const I = ICON[d.key] || BarChart3;
                    return {
                      value: d.key,
                      label: (
                        <span className="inline-flex items-center gap-2">
                          <I size={14} aria-hidden="true" /> {d.label}
                        </span>
                      ),
                      title: d.label,
                    };
                  })}
                  optionRender={(o) => {
                    const d = catalog.datasets.find((x) => x.key === o.value);
                    const I = ICON[d.key] || BarChart3;
                    return (
                      <span className="flex items-start gap-2 py-0.5">
                        <I size={15} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block text-[13.5px] font-medium">{d.label}</span>
                          <span className="block whitespace-normal text-[12px] text-ink-muted">{d.help}</span>
                        </span>
                      </span>
                    );
                  }}
                  popupMatchSelectWidth={340}
                />
              </label>
              {ds?.groups && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-medium text-ink-muted">Group by</span>
                  <Select value={q.groupBy} onChange={(v) => set({ groupBy: v })} options={ds.groups} />
                </label>
              )}
              {ds?.dated && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-medium text-ink-muted">Dates</span>
                  <Select value={q.date} onChange={pickDate} options={DATES.map((d) => ({ value: d.value, label: d.label }))} />
                </label>
              )}
              {ds?.dated && q.date === "custom" && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-medium text-ink-muted">From – to</span>
                  <div className="flex items-center gap-2">
                    <Input type="date" value={q.from} max={q.to} onChange={(e) => e.target.value && set({ from: e.target.value })} aria-label="From" />
                    <Input type="date" value={q.to} min={q.from} max={today()} onChange={(e) => e.target.value && set({ to: e.target.value })} aria-label="To" />
                  </div>
                </div>
              )}
            </div>

            {ds?.filters?.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-app-border pt-3">
                <span className="mr-1 text-[12.5px] font-medium text-ink-muted">Filters</span>
                {ds.filters.includes("paymentStatus") && (
                  <Select
                    allowClear
                    placeholder="Payment: any"
                    value={q.filters.paymentStatus}
                    onChange={(v) => setFilter("paymentStatus", v)}
                    className="min-w-[150px]"
                    options={[
                      { value: "paid", label: "Paid" },
                      { value: "pending", label: "Pending" },
                      { value: "partially_refunded", label: "Partly refunded" },
                      { value: "refunded", label: "Refunded" },
                    ]}
                  />
                )}
                {ds.filters.includes("fulfillmentStatus") && (
                  <Select
                    allowClear
                    placeholder="Fulfilment: any"
                    value={q.filters.fulfillmentStatus}
                    onChange={(v) => setFilter("fulfillmentStatus", v)}
                    className="min-w-[160px]"
                    options={[
                      { value: "unfulfilled", label: "Unfulfilled" },
                      { value: "partially_fulfilled", label: "Partly fulfilled" },
                      { value: "fulfilled", label: "Fulfilled" },
                      { value: "cancelled", label: "Cancelled" },
                    ]}
                  />
                )}
                {ds.filters.includes("paymentMethod") && (
                  <Select
                    allowClear
                    placeholder="Method: any"
                    value={q.filters.paymentMethod}
                    onChange={(v) => setFilter("paymentMethod", v)}
                    className="min-w-[160px]"
                    options={[
                      { value: "cod", label: "Cash on delivery" },
                      { value: "razorpay", label: "Razorpay" },
                      { value: "payu", label: "PayU" },
                      { value: "upi_qr", label: "UPI QR" },
                    ]}
                  />
                )}
                {ds.filters.includes("stock") && (
                  <Select
                    allowClear
                    placeholder="Stock: all"
                    value={q.filters.stock}
                    onChange={(v) => setFilter("stock", v)}
                    className="min-w-[150px]"
                    options={[
                      { value: "low", label: "Running low (1–5)" },
                      { value: "out", label: "Out of stock" },
                    ]}
                  />
                )}
                {ds.filters.includes("includeCancelled") && (
                  <Checkbox checked={Boolean(q.filters.includeCancelled)} onChange={(e) => setFilter("includeCancelled", e.target.checked)}>
                    Include cancelled orders
                  </Checkbox>
                )}
                {Object.values(q.filters).some(Boolean) && (
                  <Button size="small" type="link" icon={<RotateCcw size={13} aria-hidden="true" />} onClick={() => set({ filters: {} })}>
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </Card>

          <Card
            size="small"
            className={`transition-opacity ${loading ? "opacity-60" : ""}`}
            title={
              <span className="flex flex-wrap items-baseline gap-x-3">
                <span>{title}</span>
                {data && ds?.dated && (
                  <span className="text-[12.5px] font-normal text-ink-muted">
                    {show(data.from, "date")} – {show(data.to, "date")}
                  </span>
                )}
              </span>
            }
            extra={data?.rows.length > 8 ? <Input.Search allowClear placeholder="Search rows" value={search} onChange={(e) => setSearch(e.target.value)} className="!w-[200px]" size="small" /> : null}
            styles={{ body: { padding: 0 } }}
          >
            {!data ? (
              <div className="p-4">
                <Skeleton active />
              </div>
            ) : (
              <>
                {headline.length > 0 && (
                  <div className="grid grid-cols-2 border-b border-app-border sm:grid-cols-3 lg:grid-cols-5">
                    {headline.map((c) => (
                      <div key={c.key} className="border-r border-app-border px-4 py-3 last:border-r-0">
                        <p className="m-0 text-[12px] text-ink-muted">{c.label}</p>
                        <p className="m-0 mt-0.5 text-[18px] font-semibold text-ink" style={num}>
                          {show(data.totals[c.key], c.type)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {timeline && data.rows.length > 1 && (
                  <div className="border-b border-app-border px-4 pb-2 pt-4">
                    <AreaChart points={data.rows.map((r) => { const d = r.group.replace(/^Week of /, ""); return { date: d.length === 7 ? `${d}-01` : d, value: Number(r[lineKey]) || 0 }; })} kind={lineKey === "net" ? "currency" : "number"} label={lineKey === "net" ? "Net sales" : "Visits"} height={200} />
                  </div>
                )}
                <Table
                  rowKey={(_, i) => i}
                  size="small"
                  columns={columns}
                  dataSource={rows}
                  scroll={{ x: "max-content" }}
                  pagination={rows.length > 50 ? { pageSize: 50, showSizeChanger: true, pageSizeOptions: [50, 100, 250], size: "small" } : false}
                  locale={{ emptyText: <p className="m-0 py-10 text-[13px] text-ink-muted">Nothing for these dates and filters.</p> }}
                  summary={() =>
                    rows.length > 1 && Object.keys(data.totals).length ? (
                      <Table.Summary fixed>
                        <Table.Summary.Row className="bg-app-bg font-semibold">
                          {data.columns.map((c, i) => (
                            <Table.Summary.Cell key={c.key} index={i} align={["number", "currency", "percent"].includes(c.type) ? "right" : "left"}>
                              {i === 0 ? "Total" : data.totals[c.key] !== undefined ? show(data.totals[c.key], c.type) : ""}
                            </Table.Summary.Cell>
                          ))}
                        </Table.Summary.Row>
                      </Table.Summary>
                    ) : null
                  }
                />
                {data.truncated && <p className="m-0 border-t border-app-border px-4 py-2.5 text-[12.5px] text-ink-muted">Showing the first 5,000 rows. Choose fewer dates to see the rest.</p>}
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
