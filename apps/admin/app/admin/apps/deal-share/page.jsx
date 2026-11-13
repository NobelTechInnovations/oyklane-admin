"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Drawer, Empty, Form, Input, InputNumber, Segmented, Select, Skeleton, Switch, Table, Tag } from "antd";
import { BarChart3, Copy, Plus, Trash2 } from "lucide-react";
import { PageHeader, useConfirmDialog } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { storefrontUrlFor } from "@/lib/storefront";
import { AppNotInstalled } from "@/components/apps/AppPanelParts";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const local = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const when = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const PHASE = { live: ["green", "Live"], scheduled: ["blue", "Starts soon"], ended: ["default", "Ended"], paused: ["orange", "Paused"], draft: ["default", "Draft"], sold_out: ["purple", "Sold out"] };

/** What a shopper could save on a product at this price, with these rules. */
function capOf(v, price) {
  const p = Number(price) || 0;
  let cap = v.capType === "amount" ? Number(v.capValue) || 0 : (p * (Number(v.capValue) || 0)) / 100;
  if (v.minPrice !== null && v.minPrice !== undefined && v.minPrice !== "") cap = Math.min(cap, p - Number(v.minPrice));
  return Math.max(0, Math.floor(Math.min(cap, p)));
}

function DealDrawer({ open, deal, onClose, onSaved }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const v = Form.useWatch([], form) || {};

  useEffect(() => {
    if (!open) return;
    apiFetch("/api/products?pageSize=100&status=active")
      .then((d) => setProducts(d.products || []))
      .catch(() => {});
    form.resetFields();
    const week = new Date(Date.now() + 7 * 86400e3);
    form.setFieldsValue(
      deal
        ? { ...deal, perView: Number(deal.perView), perSale: Number(deal.perSale), joinBonus: Number(deal.joinBonus), capValue: Number(deal.capValue), minPrice: deal.minPrice == null ? null : Number(deal.minPrice), startsAt: local(deal.startsAt), endsAt: local(deal.endsAt), live: deal.status === "live" }
        : { perView: 2, perSale: 50, joinBonus: 0, capType: "percent", capValue: 30, minPrice: null, maxViews: 0, minViews: 0, stockLimit: 0, startsAt: local(new Date()), endsAt: local(week), live: true }
    );
  }, [open, deal, form]);

  const product = products.find((p) => p.id === v.productId);
  const price = product ? Math.min(...(product.variants || []).map((x) => Number(x.price)).filter((n) => n > 0)) : null;
  const cap = price && Number.isFinite(price) ? capOf(v, price) : null;
  const friendsToCap = cap && Number(v.perView) > 0 ? Math.ceil(cap / Number(v.perView)) : null;

  async function save(values) {
    setSaving(true);
    try {
      const body = {
        productId: values.productId,
        title: values.title,
        startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : undefined,
        endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : undefined,
        status: values.live ? "live" : "paused",
        perView: values.perView,
        perSale: values.perSale,
        joinBonus: values.joinBonus,
        capType: values.capType,
        capValue: values.capValue,
        minPrice: values.minPrice ?? null,
        maxViews: values.maxViews,
        minViews: values.minViews,
        stockLimit: values.stockLimit,
      };
      await apiFetch(deal ? `/api/deal-share/${deal.id}` : "/api/deal-share", { method: deal ? "PATCH" : "POST", body });
      message.success(deal ? "Deal saved" : "Deal created — it shows on the product page");
      onSaved();
      onClose();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={560}
      title={deal ? "Edit deal" : "New deal"}
      destroyOnHidden
      extra={
        <Button type="primary" loading={saving} onClick={() => form.submit()}>
          Save
        </Button>
      }
    >
      <Form form={form} layout="vertical" requiredMark={false} onFinish={save}>
        <Form.Item name="productId" label="Product" rules={[{ required: true, message: "Choose a product" }]}>
          <Select showSearch optionFilterProp="label" placeholder="Search products" disabled={Boolean(deal)} options={products.map((p) => ({ value: p.id, label: p.title }))} />
        </Form.Item>
        <Form.Item name="title" label="Name shown to shoppers" extra="Empty shows “Share & save”.">
          <Input maxLength={80} placeholder="Share & save" />
        </Form.Item>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item name="startsAt" label="Starts" rules={[{ required: true, message: "Choose when it starts" }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="endsAt" label="Ends" rules={[{ required: true, message: "Choose when it ends" }]} extra="Shoppers' points lapse at this time.">
            <Input type="datetime-local" />
          </Form.Item>
        </div>

        <h3 className="m-0 mb-1 border-t border-app-border pt-4 text-[13px] font-semibold text-ink">Rewards</h3>
        <p className="m-0 mb-3 text-[12.5px] text-ink-muted">1 point = ₹1 off this product. A friend counts once per link, only when they open it signed in to your store.</p>
        <div className="grid gap-x-4 sm:grid-cols-3">
          <Form.Item name="perView" label="Per friend who opens the link">
            <InputNumber min={0} max={10000} addonAfter="pts" className="w-full" />
          </Form.Item>
          <Form.Item name="perSale" label="Per friend who buys">
            <InputNumber min={0} max={100000} addonAfter="pts" className="w-full" />
          </Form.Item>
          <Form.Item name="joinBonus" label="Welcome points" extra="For joining from a friend's link.">
            <InputNumber min={0} max={10000} addonAfter="pts" className="w-full" />
          </Form.Item>
        </div>

        <h3 className="m-0 mb-1 border-t border-app-border pt-4 text-[13px] font-semibold text-ink">Limits — so nothing goes free</h3>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item label="Most a shopper can save">
            <div className="flex gap-2">
              <Form.Item name="capType" noStyle>
                <Segmented options={[{ value: "percent", label: "%" }, { value: "amount", label: "₹" }]} />
              </Form.Item>
              <Form.Item name="capValue" noStyle>
                <InputNumber min={0} max={v.capType === "amount" ? 1000000 : 90} className="flex-1" />
              </Form.Item>
            </div>
          </Form.Item>
          <Form.Item name="minPrice" label="Price never below (₹)" extra="Empty: only the limit above.">
            <InputNumber min={0} className="w-full" placeholder="e.g. 499" />
          </Form.Item>
          <Form.Item name="maxViews" label="Friends counted per shopper" extra="0 = no limit.">
            <InputNumber min={0} max={100000} className="w-full" />
          </Form.Item>
          <Form.Item name="minViews" label="Friends needed before points can be used" extra="0 = any time.">
            <InputNumber min={0} max={1000} className="w-full" />
          </Form.Item>
          <Form.Item name="stockLimit" label="Pieces at a deal price" extra="0 = no limit. The deal closes when they're gone.">
            <InputNumber min={0} max={1000000} className="w-full" />
          </Form.Item>
          <Form.Item name="live" label="Deal is on" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>

        {cap !== null && (
          <Alert
            type="info"
            showIcon
            message={`At ${inr(price)}, a shopper can save at most ${inr(cap)} — they pay at least ${inr(price - cap)}.`}
            description={friendsToCap ? `That's about ${friendsToCap} friends opening their link${Number(v.perSale) > 0 ? `, fewer if friends buy (${v.perSale} points each)` : ""}.` : null}
          />
        )}
      </Form>
    </Drawer>
  );
}

function Report({ id, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!id) return;
    setData(null);
    apiFetch(`/api/deal-share/${id}/report`).then(setData).catch(() => setData(false));
  }, [id]);
  const t = data?.totals;
  return (
    <Drawer open={Boolean(id)} onClose={onClose} width={720} title="Deal report" destroyOnHidden>
      {!data ? (
        data === false ? <p className="text-ink-muted">Couldn&apos;t load the report.</p> : <Skeleton active />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Sharers", t.sharers],
              ["Friends reached", t.friends],
              ["New shoppers", t.newShoppers],
              ["Orders from links", t.orders],
              ["Sales from links", inr(t.revenue)],
              ["Points used", t.redeemed],
              ["Discount given", inr(t.discountGiven)],
              ["Link opens", t.views],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-app-border px-3 py-2.5">
                <p className="m-0 text-[12px] text-ink-muted">{label}</p>
                <p className="m-0 text-[18px] font-semibold tabular-nums text-ink">{value}</p>
              </div>
            ))}
          </div>
          {t.discountGiven > 0 && t.revenue > 0 && (
            <p className="m-0 text-[13px] text-ink-muted">
              Every ₹1 of discount brought {inr(t.revenue / t.discountGiven)} in sales from shared links{t.newShoppers ? `, and ${t.newShoppers} new shoppers signed up` : ""}.
            </p>
          )}
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={data.leaders}
            locale={{ emptyText: "No one has shared yet" }}
            columns={[
              { title: "Shopper", render: (_, l) => <span className="flex flex-col"><span className="text-[13px] text-ink">{l.name}</span><span className="text-[11.5px] text-ink-muted">joined from {l.joinedVia}</span></span> },
              { title: "Friends", dataIndex: "views", align: "right" },
              { title: "Orders", dataIndex: "sales", align: "right" },
              { title: "Points", align: "right", render: (_, l) => <span className="tabular-nums">{Math.floor(l.points.earned)}{l.points.earned > l.points.cap ? ` (max ${l.points.cap})` : ""}</span> },
              { title: "", render: (_, l) => (l.redeemed ? <Tag color="green" className="!m-0">Used</Tag> : null) },
            ]}
          />
        </div>
      )}
    </Drawer>
  );
}

/** Apps ▸ Deal Share: share-to-save deals and how they're doing. */
export default function DealSharePage() {
  const { message } = App.useApp();
  const { confirmDialog } = useConfirmDialog();
  const [rows, setRows] = useState(null);
  const [missing, setMissing] = useState(false);
  const [drawer, setDrawer] = useState({ open: false, deal: null });
  const [report, setReport] = useState(null);
  const [store, setStore] = useState(null);

  useEffect(() => {
    apiFetch("/api/store")
      .then((r) => setStore(r.store))
      .catch(() => {});
  }, []);
  const load = useCallback(async () => {
    try {
      setRows((await apiFetch("/api/deal-share")).deals);
    } catch (err) {
      if (err.status === 402) setMissing(true);
      else message.error(err.message);
    }
  }, [message]);
  useEffect(() => {
    load();
  }, [load]);

  const productUrl = useMemo(() => (slug) => (store ? `${storefrontUrlFor(store)}/products/${slug}` : ""), [store]);

  if (missing) return <AppNotInstalled appKey="deal-share" title="Deal Share" description="Shoppers share your product with friends and save on it — reach without ad spend." />;
  if (!rows) return <Skeleton active />;

  async function remove(d) {
    const ok = await confirmDialog({ title: "Delete this deal?", content: "Shoppers' links and points for it are deleted too. Codes already made keep working until the deal's end time.", okText: "Delete", danger: true });
    if (!ok) return;
    try {
      await apiFetch(`/api/deal-share/${d.id}`, { method: "DELETE" });
      message.success("Deal deleted");
      load();
    } catch (err) {
      message.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Deal Share"
        subtitle="Shoppers share a product's link; each friend who opens it signed in, and each order it brings, earns them points off it — up to your limit, until the deal ends."
        actions={
          <Button type="primary" icon={<Plus size={14} aria-hidden="true" />} onClick={() => setDrawer({ open: true, deal: null })}>
            New deal
          </Button>
        }
      />
      {rows.length === 0 ? (
        <div className="rounded-[14px] border border-app-border bg-app-surface p-10">
          <Empty description="No deals yet. Pick a product, set the reward and a limit, and it shows a “Share & save” box on that product's page.">
            <Button type="primary" onClick={() => setDrawer({ open: true, deal: null })}>
              Create your first deal
            </Button>
          </Empty>
        </div>
      ) : (
        <Table
          rowKey="id"
          dataSource={rows}
          pagination={false}
          scroll={{ x: "max-content" }}
          className="rounded-[14px] border border-app-border bg-app-surface"
          columns={[
            {
              title: "Product",
              render: (_, d) => (
                <span className="flex items-center gap-3">
                  {d.product?.image ? <img src={d.product.image} alt="" className="h-10 w-10 rounded-md border border-app-border object-cover" /> : <span className="h-10 w-10 rounded-md bg-app-bg" />}
                  <span className="flex flex-col">
                    <span className="text-[13.5px] font-medium text-ink">{d.product?.title || "Deleted product"}</span>
                    <span className="text-[12px] text-ink-muted">{d.title || "Share & save"}</span>
                  </span>
                </span>
              ),
            },
            { title: "Status", render: (_, d) => <Tag color={PHASE[d.phase]?.[0]} className="!m-0">{PHASE[d.phase]?.[1] || d.phase}</Tag> },
            { title: "Reward", render: (_, d) => <span className="text-[12.5px]">{Number(d.perView)} pts / friend · {Number(d.perSale)} / order</span> },
            { title: "Max saving", render: (_, d) => <span className="tabular-nums">{inr(d.maxSaving)}</span> },
            { title: "Sharers", align: "right", render: (_, d) => d.stats.sharers },
            { title: "Friends", align: "right", render: (_, d) => d.stats.views },
            { title: "Orders", align: "right", render: (_, d) => d.stats.orders },
            { title: "Ends", render: (_, d) => <span className="text-[12.5px] text-ink-muted tabular-nums">{when(d.endsAt)}</span> },
            {
              title: "",
              render: (_, d) => (
                <span className="flex items-center gap-1">
                  <Button size="small" icon={<BarChart3 size={13} aria-hidden="true" />} onClick={() => setReport(d.id)}>
                    Report
                  </Button>
                  <Button size="small" onClick={() => setDrawer({ open: true, deal: d })}>
                    Edit
                  </Button>
                  {d.product?.slug && (
                    <Button size="small" type="text" icon={<Copy size={13} aria-hidden="true" />} aria-label="Copy product link" onClick={() => navigator.clipboard?.writeText(productUrl(d.product.slug)).then(() => message.success("Product link copied"))} />
                  )}
                  <Button size="small" type="text" danger icon={<Trash2 size={13} aria-hidden="true" />} aria-label="Delete deal" onClick={() => remove(d)} />
                </span>
              ),
            },
          ]}
        />
      )}
      <DealDrawer open={drawer.open} deal={drawer.deal} onClose={() => setDrawer({ open: false, deal: null })} onSaved={load} />
      <Report id={report} onClose={() => setReport(null)} />
    </div>
  );
}
