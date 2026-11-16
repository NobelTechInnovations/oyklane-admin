"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { App, Alert, Button, Card, Radio, Select, Skeleton, Switch, Table, Tag, Tooltip } from "antd";
import { Download, FileJson, RefreshCw } from "lucide-react";
import { formatCurrency } from "@shopcycle/utils";
import { PageHeader } from "@shopcycle/ui";
import { apiDownload, apiFetch } from "@/lib/api";
import { AppNotInstalled } from "@/components/apps/AppPanelParts";

const money = (n) => formatCurrency(Number(n) || 0, "INR");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Last 18 months (or 6 quarters), newest first. Value "YYYY-MM". */
function periodOptions(quarterly) {
  const now = new Date(Date.now() + 19800000);
  const out = [];
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth() + 1;
  if (quarterly) {
    m = m >= 4 ? m - ((m - 4) % 3) : 1;
    for (let i = 0; i < 6; i += 1) {
      const end = m + 2;
      out.push({ value: `${y}-${String(m).padStart(2, "0")}`, label: `${MONTHS[m - 1].slice(0, 3)}–${MONTHS[end - 1].slice(0, 3)} ${y}` });
      m -= 3;
      if (m < 1) {
        m = 10;
        y -= 1;
      }
    }
    return out;
  }
  for (let i = 0; i < 18; i += 1) {
    out.push({ value: `${y}-${String(m).padStart(2, "0")}`, label: `${MONTHS[m - 1]} ${y}` });
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}

const TABLES = [
  { key: "b2b", sheet: "b2b", label: "B2B invoices", portal: "4A, 4B, 6B, 6C" },
  { key: "b2cl", sheet: "b2cl", label: "B2C large invoices", portal: "5A, 5B" },
  { key: "exp", sheet: "exp", label: "Exports", portal: "6A" },
  { key: "b2cs", sheet: "b2cs", label: "B2C others", portal: "7" },
  { key: "nil", sheet: "exemp", label: "Nil rated, exempt, non-GST", portal: "8A–8D" },
  { key: "cdnr", sheet: "cdnr", label: "Credit notes — registered", portal: "9B" },
  { key: "cdnur", sheet: "cdnur", label: "Credit notes — unregistered", portal: "9B" },
  { key: "hsn_b2b", sheet: "hsn_b2b", label: "HSN summary — B2B", portal: "12" },
  { key: "hsn_b2c", sheet: "hsn_b2c", label: "HSN summary — B2C", portal: "12" },
  { key: "docs", sheet: "docs", label: "Documents issued", portal: "13" },
];

const LEVEL = { block: { color: "red", text: "Fix before filing" }, check: { color: "gold", text: "Check" }, info: { color: "default", text: "Note" } };

export default function GstReturnsPage() {
  const { message } = App.useApp();
  const [settings, setSettings] = useState(null);
  const [month, setMonth] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/api/gst-returns/settings")
      .then((s) => {
        setSettings(s);
        // Default: the last finished month (or quarter) — the one due now.
        const opts = periodOptions(s.quarterly);
        setMonth((opts[1] || opts[0]).value);
      })
      .catch((err) => (err.status === 404 ? setMissing(true) : setError(err.message)));
  }, []);

  const load = useCallback(async () => {
    if (!month || !settings) return;
    setLoading(true);
    setError(null);
    try {
      setData(await apiFetch(`/api/gst-returns/gstr1?month=${month}&quarterly=${settings.quarterly ? 1 : 0}`));
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [month, settings]);

  useEffect(() => {
    load();
  }, [load]);

  const options = useMemo(() => periodOptions(Boolean(settings?.quarterly)), [settings?.quarterly]);

  async function save(patch) {
    setSaving(true);
    try {
      const next = await apiFetch("/api/gst-returns/settings", { method: "PUT", body: patch });
      if (patch.quarterly !== undefined) setMonth((periodOptions(next.quarterly)[1] || periodOptions(next.quarterly)[0]).value);
      setSettings(next);
      message.success("Saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function download(format, section) {
    try {
      await apiDownload(`/api/gst-returns/gstr1/download?month=${month}&quarterly=${settings.quarterly ? 1 : 0}&format=${format}${section ? `&section=${section}` : ""}`, format === "json" ? "gstr1.json" : `${section}.csv`);
    } catch (err) {
      message.error(err.message);
    }
  }

  if (missing) return <AppNotInstalled appKey="gst-returns" title="GST Returns (GSTR-1)" description="Your GST invoices and refunds sorted into GSTR-1's tables, checked, and ready to upload on the GST portal." />;
  if (!settings) return error ? <Alert type="error" showIcon message={error} /> : <Skeleton active paragraph={{ rows: 8 }} />;

  const s = data?.summary;
  const blockers = (data?.issues || []).filter((i) => i.level === "block");
  const rows = s
    ? TABLES.map((t) => ({ ...t, ...s[t.key], rows: data.counts?.[t.sheet] || 0 })).filter((r) => r.count || r.rows || ["b2b", "b2cs", "hsn_b2b", "hsn_b2c", "docs"].includes(r.key))
    : [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="GST Returns (GSTR-1)" subtitle={data?.gstin ? `GSTIN ${data.gstin}` : "Outward supplies, ready to upload on the GST portal"} backHref="/admin/apps" />

      <Card size="small">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] text-ink-muted">Return period</span>
          <Select value={month} onChange={setMonth} options={options} className="!w-[200px]" aria-label="Return period" />
          <Button icon={<RefreshCw size={14} aria-hidden="true" />} onClick={load} loading={loading}>
            Refresh
          </Button>
          <span className="ml-auto text-[12.5px] text-ink-muted">{settings.quarterly ? "Quarterly (QRMP)" : "Monthly"} filing · change below</span>
        </div>
      </Card>

      {error && <Alert type="error" showIcon message={error} />}
      {!data && loading && <Skeleton active paragraph={{ rows: 8 }} />}

      {data && (
        <>
          {data.period.open && <Alert type="info" showIcon message={`${data.period.label} isn't over yet — the return will change as more invoices are issued.`} />}
          {data.stats && (
            <p className="m-0 text-[13px] text-ink-muted">
              GSTR-1 counts GST invoices by their date. Orders placed in {data.period.label}: <b className="font-medium text-ink">{data.stats.orders}</b> · GST invoices dated in it:{" "}
              <b className="font-medium text-ink">{data.stats.invoicedHere}</b>
              {data.stats.invoicedLater > 0 && <> · invoiced in a later month: {data.stats.invoicedLater}</>}
              {data.stats.imported > 0 && <> · imported, invoiced on your old platform: {data.stats.imported}</>}
              {data.stats.noInvoice > 0 && <> · without a GST invoice: {data.stats.noInvoice}</>}
            </p>
          )}
          {data.empty ? (
            <Alert
              type="info"
              showIcon
              message={`No GST invoices dated in ${data.period.label}`}
              description={
                <>
                  Nothing to upload for this period. If you made no sales, file a Nil GSTR-1 on the portal (Returns Dashboard ▸ {data.period.label} ▸ GSTR-1 ▸ tick “File Nil GSTR-1”) — no file needed. If you sold but the invoices were made elsewhere (your old platform or billing software), file from there.
                </>
              }
            />
          ) : data.ready ? (
            <Alert type="success" showIcon message={`${data.period.label} is ready to file`} description="Check the notes below, then download the file and upload it on the GST portal." />
          ) : (
            <Alert type="error" showIcon message={`${blockers.length} ${blockers.length === 1 ? "thing" : "things"} to fix before filing ${data.period.label}`} description="The GST portal would reject the file or the numbers would be wrong. Fix them, then press Refresh." />
          )}

          {data.issues.length > 0 && (
            <Card size="small" title="Checks">
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {data.issues.map((i) => (
                  <li key={i.key} className="border-b border-app-border pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag color={LEVEL[i.level].color} className="!m-0">
                        {LEVEL[i.level].text}
                      </Tag>
                      <b className="text-[13.5px] font-medium text-ink">{i.title}</b>
                      {i.count > 1 && <span className="text-[12.5px] text-ink-muted">{i.count}</span>}
                    </div>
                    {i.detail && <p className="m-0 mt-1 text-[13px] text-ink-muted">{i.detail}</p>}
                    {i.items?.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
                        {i.items.map((x) =>
                          x.href ? (
                            <Link key={x.label} href={x.href} className="text-ink underline underline-offset-2">
                              {x.label}
                            </Link>
                          ) : (
                            <span key={x.label}>{x.label}</span>
                          ),
                        )}
                        {i.count > i.items.length && <span className="text-ink-muted">and {i.count - i.items.length} more</span>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card size="small" title={`GSTR-1 · ${data.period.label}`} extra={<span className="text-[12.5px] text-ink-muted">Compare with the portal's summary after upload</span>}>
            <Table
              size="small"
              rowKey="key"
              pagination={false}
              dataSource={rows}
              scroll={{ x: 820 }}
              columns={[
                { title: "Table", dataIndex: "label", render: (v, r) => <span>{v} <span className="text-ink-muted">· {r.portal}</span></span> },
                { title: "Records", dataIndex: "count", align: "right" },
                { title: "Taxable value", dataIndex: "taxable", align: "right", render: (v, r) => (r.key === "docs" ? "—" : money(v)) },
                { title: "IGST", dataIndex: "igst", align: "right", render: (v, r) => (r.key === "docs" ? "—" : money(v)) },
                { title: "CGST", dataIndex: "cgst", align: "right", render: (v, r) => (r.key === "docs" ? "—" : money(v)) },
                { title: "SGST", dataIndex: "sgst", align: "right", render: (v, r) => (r.key === "docs" ? "—" : money(v)) },
                { title: "Cess", dataIndex: "cess", align: "right", render: (v, r) => (r.key === "docs" ? "—" : money(v)) },
                {
                  title: "",
                  key: "csv",
                  align: "right",
                  render: (_, r) =>
                    r.rows ? (
                      <Tooltip title="This table in the GST offline tool's columns">
                        <Button size="small" type="text" icon={<Download size={14} aria-hidden="true" />} onClick={() => download("csv", r.sheet)} aria-label={`Download ${r.label} as CSV`}>
                          CSV
                        </Button>
                      </Tooltip>
                    ) : null,
                },
              ]}
            />
            <div className="mt-3 flex flex-wrap justify-end gap-x-6 gap-y-1 border-t border-app-border pt-3 text-[13px]">
              <span className="text-ink-muted">Tax on these sales, net of credit notes:</span>
              <span>IGST {money(data.liability.igst)}</span>
              <span>CGST {money(data.liability.cgst)}</span>
              <span>SGST {money(data.liability.sgst)}</span>
              <b className="font-medium">Total {money(data.liability.total)}</b>
            </div>
          </Card>

          {!data.empty && (
          <Card size="small" title="File it on the GST portal">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <ol className="m-0 flex max-w-[640px] flex-col gap-1.5 pl-5 text-[13.5px] text-ink">
                <li>Download the GSTR-1 file for {data.period.label}.</li>
                <li>
                  On <a href="https://www.gst.gov.in" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">gst.gov.in</a>, log in ▸ Services ▸ Returns ▸ Returns Dashboard ▸ choose {data.period.label}.
                </li>
                <li>GSTR-1 ▸ Prepare Offline ▸ Upload ▸ choose the file. It takes a few minutes; if it says “Processed with error”, open the error report, fix those invoices here and upload again.</li>
                <li>Prepare Online ▸ check each table's totals match the table above.</li>
                <li>Generate summary ▸ tick the declaration ▸ File with DSC or EVC.</li>
              </ol>
              <div className="flex flex-col items-start gap-1.5 md:items-end">
                <Tooltip title={data.ready ? "" : "Fix the items marked “Fix before filing” first"}>
                  <Button type="primary" icon={<FileJson size={15} aria-hidden="true" />} disabled={!data.ready} onClick={() => download("json")}>
                    Download GSTR-1 file
                  </Button>
                </Tooltip>
                <span className="text-[12px] text-ink-muted">JSON, for Prepare Offline ▸ Upload</span>
              </div>
            </div>
            <p className="m-0 mt-3 text-[12.5px] text-ink-muted">
              Uploading again for the same period replaces invoices with the same number and adds new ones; it doesn't delete invoices already on the portal. Refunds are filed as credit notes, numbered CN-…, dated the day of the refund.
            </p>
            <p className="m-0 mt-1 text-[12.5px] text-ink-muted">The portal takes this JSON file only — not PDF or Excel. The CSVs above are for checking, or for the GST offline tool.</p>
          </Card>
          )}
        </>
      )}

      <Card size="small" title="Settings">
        <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-[13px] font-medium text-ink">How you file</div>
            <Radio.Group value={settings.quarterly} disabled={saving} onChange={(e) => save({ quarterly: e.target.value })} optionType="button" options={[{ value: false, label: "Monthly" }, { value: true, label: "Quarterly (QRMP)" }]} />
          </div>
          <div>
            <div className="mb-1 text-[13px] font-medium text-ink">Sales with 0% GST are</div>
            <Radio.Group value={settings.zeroAs} disabled={saving} onChange={(e) => save({ zeroAs: e.target.value })} optionType="button" options={[{ value: "nil", label: "Nil rated" }, { value: "exempt", label: "Exempt" }]} />
          </div>
          <div>
            <div className="mb-1 text-[13px] font-medium text-ink">Unit for the HSN summary</div>
            <Select
              value={settings.uqc}
              disabled={saving}
              onChange={(uqc) => save({ uqc })}
              className="!w-[200px]"
              aria-label="Unit quantity code"
              options={[
                ["NOS", "Numbers"],
                ["PCS", "Pieces"],
                ["UNT", "Units"],
                ["SET", "Sets"],
                ["PRS", "Pairs"],
                ["BOX", "Box"],
                ["PAC", "Packs"],
                ["BTL", "Bottles"],
                ["KGS", "Kilograms"],
                ["GMS", "Grams"],
                ["LTR", "Litres"],
                ["MLT", "Millilitres"],
                ["MTR", "Metres"],
                ["DOZ", "Dozens"],
                ["OTH", "Others"],
              ].map(([value, label]) => ({ value, label: `${value} — ${label}` }))}
            />
          </div>
          <div>
            <div className="mb-1 text-[13px] font-medium text-ink">Turnover last year above ₹5 crore</div>
            <div className="flex items-center gap-2">
              <Switch checked={settings.bigTurnover} disabled={saving} onChange={(v) => save({ bigTurnover: v })} />
              <span className="text-[12.5px] text-ink-muted">HSN codes then need 6 digits (else 4).</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
