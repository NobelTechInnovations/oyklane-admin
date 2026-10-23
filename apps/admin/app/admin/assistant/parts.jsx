"use client";

import { useEffect, useState } from "react";
import { App, Button, Input, InputNumber, Modal, Form, Segmented, Select, Switch, Tag, Tooltip, Empty } from "antd";
import { Check, X, MessageCircle, Gift, ShieldAlert, Zap, Eye, ShoppingCart, CreditCard, Search, Pencil, Trash2, Plus, Sparkles, OctagonX, Play } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const inr = (n) => (n == null ? "—" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`);
const ago = (d) => {
  if (!d) return "";
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};
export const STAGE = {
  checkout: { label: "At checkout", color: "#B42318", bg: "#FEF3F2" },
  cart: { label: "In cart", color: "#B54708", bg: "#FFFAEB" },
  considering: { label: "Considering", color: "#0067B8", bg: "#E5F1FB" },
  browsing: { label: "Browsing", color: "#475467", bg: "#F2F4F7" },
  purchased: { label: "Bought", color: "#067647", bg: "#ECFDF3" },
};

export function StagePill({ stage }) {
  const s = STAGE[stage] || STAGE.browsing;
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: s.color, background: s.bg }}>{s.label}</span>;
}

function Thumb({ src }) {
  return <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-app-border bg-app-bg">{src ? <img src={src} alt="" className="h-full w-full object-cover" /> : null}</span>;
}

/** Facts first, then the estimate (always labelled). */
function Activity({ a, small }) {
  const chips = [];
  if (a?.views || a?.productViews) chips.push([Eye, `${a.views ?? a.productViews} view${(a.views ?? a.productViews) === 1 ? "" : "s"}`]);
  if (a?.addedToCart) chips.push([ShoppingCart, "Added to cart"]);
  if (a?.reachedCheckout || a?.checkoutStarts) chips.push([CreditCard, "Reached checkout"]);
  if (a?.searches?.length) chips.push([Search, `Searched “${a.searches[a.searches.length - 1]}”`]);
  if (!chips.length) return null;
  return (
    <span className={`flex flex-wrap gap-1.5 ${small ? "" : "mt-1.5"}`}>
      {chips.map(([Icon, t]) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-md bg-app-bg px-1.5 py-0.5 text-[11.5px] text-ink-muted">
          <Icon size={11} aria-hidden="true" /> {t}
        </span>
      ))}
    </span>
  );
}

export function BuyerRow({ b, onAsk }) {
  return (
    <div className="rounded-xl border border-app-border bg-app-surface p-3">
      <div className="flex items-start gap-3">
        <Thumb src={b.topProduct?.image} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-semibold text-ink truncate">{b.label}</span>
            <StagePill stage={b.stage} />
            {b.estimate?.purchaseLikelihood != null && (
              <Tooltip title="An estimate from their activity — not a fact">
                <span className="text-[11.5px] text-ink-muted">~{b.estimate.purchaseLikelihood}% likely to buy</span>
              </Tooltip>
            )}
          </div>
          {b.topProduct && <p className="m-0 mt-0.5 text-[12.5px] text-ink-muted truncate">Interested in {b.topProduct.title}</p>}
          <Activity a={b.topProduct?.activity || b.activity} />
          {b.next?.text && <p className="m-0 mt-2 text-[12.5px] text-ink">{b.next.text}</p>}
        </div>
      </div>
      {onAsk && b.customer && b.stage !== "purchased" && (
        <div className="mt-2.5 flex flex-wrap gap-2 pl-[52px]">
          <Button size="small" icon={<Gift size={13} aria-hidden="true" />} onClick={() => onAsk(`Create a personalized deal for ${b.customer.name}`)}>
            Make a deal
          </Button>
          <Button size="small" icon={<MessageCircle size={13} aria-hidden="true" />} onClick={() => onAsk(`Contact ${b.customer.name} on WhatsApp`)}>
            WhatsApp
          </Button>
        </div>
      )}
    </div>
  );
}

const STATUS = { suggested: ["Suggested", "default"], pending: ["Needs your approval", "gold"], approved: ["Approved", "blue"], sent: ["Sent", "green"], rejected: ["Rejected", "default"], failed: ["Failed", "red"], expired: ["Expired", "default"] };

export function ActionCard({ action: initial, compact = false, onChanged }) {
  const { message } = App.useApp();
  const [a, setA] = useState(initial);
  const [busy, setBusy] = useState(null);
  const [text, setText] = useState(initial.payload?.message || "");
  const [pct, setPct] = useState(initial.payload?.percent || 0);
  useEffect(() => setA(initial), [initial]);
  const open = ["suggested", "pending", "approved"].includes(a.status);
  const p = a.payload || {};
  const est = a.prediction || {};

  async function act(kind) {
    setBusy(kind);
    try {
      if (kind === "approve" && (text !== p.message || Number(pct) !== Number(p.percent || 0))) {
        await apiFetch(`/api/assistant/actions/${a.id}`, { method: "PATCH", body: { message: text, ...(p.listPrice ? { percent: Number(pct) } : {}) } });
      }
      const { action } = await apiFetch(`/api/assistant/actions/${a.id}/${kind}`, { method: "POST" });
      setA(action);
      message.success(kind === "approve" ? "Sent on WhatsApp" : "Dismissed");
      onChanged?.();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  const [label, color] = STATUS[a.status] || [a.status, "default"];
  return (
    <div className="rounded-xl border border-app-border bg-app-surface p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="m-0 text-[13.5px] font-semibold text-ink">{a.title}</p>
          <p className="m-0 mt-0.5 text-[12px] text-ink-muted">
            {a.kind === "negotiation" ? "Negotiation" : a.kind === "offer" ? "Personal offer" : "Message"} · {a.createdBy === "autopilot" ? "Autopilot" : a.createdBy === "seller" ? "You" : "AI"} · {ago(a.createdAt)}
          </p>
        </div>
        <Tag color={color} className="!m-0 shrink-0">{label}</Tag>
      </div>
      {!compact && <p className="m-0 mt-2 text-[12.5px] text-ink leading-relaxed">{a.reason}</p>}
      {p.listPrice ? (
        <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-app-bg px-2 py-1.5">
            <p className="m-0 text-[10.5px] text-ink-muted">Offer</p>
            <p className="m-0 text-[14px] font-semibold tabular-nums">{inr(p.price)}</p>
          </div>
          <div className="rounded-lg bg-app-bg px-2 py-1.5">
            <p className="m-0 text-[10.5px] text-ink-muted">List price</p>
            <p className="m-0 text-[14px] tabular-nums text-ink-muted line-through">{inr(p.listPrice)}</p>
          </div>
          <div className="rounded-lg bg-app-bg px-2 py-1.5">
            <p className="m-0 text-[10.5px] text-ink-muted">Your floor</p>
            <p className="m-0 text-[14px] tabular-nums">{inr(p.floor)}</p>
          </div>
        </div>
      ) : null}
      {(est.conversionUpliftPercent != null || est.purchaseLikelihood != null) && (
        <p className="m-0 mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-ink-muted">
          <span className="font-medium text-[#0067B8]">Estimates</span>
          {est.purchaseLikelihood != null && <span>~{est.purchaseLikelihood}% likely to buy now</span>}
          {est.conversionUpliftPercent != null && <span>+{est.conversionUpliftPercent}% with this</span>}
          {est.expectedRevenue != null && <span>~{inr(est.expectedRevenue)} expected</span>}
          {est.marginGivenUp ? <span>{inr(est.marginGivenUp)} margin given</span> : null}
        </p>
      )}
      {open && !compact && (
        <>
          {p.listPrice ? (
            <div className="mt-3 flex items-center gap-2 text-[12.5px]">
              <span className="text-ink-muted">Discount</span>
              <InputNumber size="small" min={0} max={Math.floor(((p.listPrice - p.floor) / p.listPrice) * 100)} value={pct} onChange={setPct} addonAfter="%" className="!w-28" />
              <span className="text-ink-muted">= {inr(Math.round(p.listPrice * (1 - (Number(pct) || 0) / 100)))}</span>
            </div>
          ) : null}
          <Input.TextArea className="!mt-2.5 !text-[13px]" autoSize={{ minRows: 2, maxRows: 6 }} value={text} onChange={(e) => setText(e.target.value)} />
          {p.percent > 0 && <p className="m-0 mt-1 text-[11px] text-ink-muted">{"{CODE}"} becomes a one-use code for this buyer and product.</p>}
        </>
      )}
      {a.status === "sent" && p.sentText && <p className="m-0 mt-2 rounded-lg bg-[#ECFDF3] px-2.5 py-2 text-[12.5px] text-[#05603A]">“{p.sentText}”</p>}
      {a.error && <p className="m-0 mt-2 text-[12px] text-[#B42318]">{a.error}</p>}
      {open && (
        <div className="mt-3 flex justify-end gap-2">
          <Button size="small" icon={<X size={13} aria-hidden="true" />} loading={busy === "reject"} onClick={() => act("reject")}>
            Dismiss
          </Button>
          <Button size="small" type="primary" icon={<Check size={13} aria-hidden="true" />} loading={busy === "approve"} onClick={() => act("approve")}>
            Approve & send
          </Button>
        </div>
      )}
    </div>
  );
}

export function ProductsCard({ products }) {
  if (!products?.length) return null;
  const max = Math.max(...products.map((p) => p.interest), 1);
  return (
    <div className="rounded-xl border border-app-border bg-app-surface p-3.5">
      {products.map((p) => (
        <div key={p.productId} className="py-1.5">
          <div className="flex justify-between gap-3 text-[13px]">
            <span className="truncate text-ink">{p.title}</span>
            <span className="shrink-0 text-ink-muted tabular-nums">{p.buyers} interested · {p.purchases} bought</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-app-bg">
            <div className="h-1.5 rounded-full bg-gradient-to-r from-[#0067B8] to-[#2B9FE6]" style={{ width: `${Math.max(4, (p.interest / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SettingsCard({ card, onDone }) {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const pr = card.proposal || {};
  const text = pr.paused === true ? "Emergency stop — nothing is sent until you resume." : pr.paused === false ? "Resume the assistant." : `Switch to ${pr.mode} mode${pr.productTitles?.length ? ` for ${pr.productTitles.join(", ")}` : ""}.`;
  async function confirm() {
    setBusy(true);
    try {
      const body = { ...pr };
      delete body.productTitles;
      await apiFetch("/api/assistant/settings", { method: "PUT", body });
      setDone(true);
      message.success("Updated");
      onDone?.();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-app-border bg-app-surface p-3.5">
      <span className="text-[13px] text-ink">{text}</span>
      <Button type={pr.paused ? "primary" : "primary"} danger={pr.paused === true} disabled={done} loading={busy} onClick={confirm}>
        {done ? "Done" : "Confirm"}
      </Button>
    </div>
  );
}

// ── Side panels ──────────────────────────────────────────────────

export function RulesPanel() {
  const { message } = App.useApp();
  const [rules, setRules] = useState(null);
  const [editing, setEditing] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [preview, setPreview] = useState(null);
  const [form] = Form.useForm();
  const scope = Form.useWatch("scope", form);
  const load = () => apiFetch("/api/assistant/rules").then((d) => setRules(d.rules)).catch((e) => message.error(e.message));
  useEffect(() => {
    load();
    apiFetch("/api/products?pageSize=100").then((d) => setProducts(d.products || [])).catch(() => {});
    apiFetch("/api/categories?pageSize=100").then((d) => setCategories(d.categories || [])).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function open(r) {
    setEditing(r || {});
    form.setFieldsValue(r || { scope: "store", maxDiscountPercent: 10, steps: 3, maxConcessions: 3, freeShipping: true, suggestAlternatives: true, active: true });
  }
  async function save(v) {
    try {
      await apiFetch("/api/assistant/rules", { method: "PUT", body: v });
      setEditing(null);
      load();
    } catch (err) {
      message.error(err.message);
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[12.5px] text-ink-muted">The assistant never offers below a product&apos;s floor: the highest of your minimum price, cost + minimum margin, and list price minus the maximum discount. Product rules beat category rules, which beat the store rule.</p>
      {(rules || []).map((r) => (
        <div key={r.id} className="rounded-xl border border-app-border p-3 text-[12.5px]">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-ink">{r.scope === "store" ? "Whole store" : r.targetName}</span>
            <span className="flex gap-1">
              <Button size="small" type="text" icon={<Pencil size={13} />} aria-label="Edit" onClick={() => open(r)} />
              <Button size="small" type="text" danger icon={<Trash2 size={13} />} aria-label="Delete" onClick={() => apiFetch(`/api/assistant/rules/${r.id}`, { method: "DELETE" }).then(load)} />
            </span>
          </div>
          <p className="m-0 mt-1 text-ink-muted">
            Up to {r.maxDiscountPercent}% off{r.minPrice != null ? ` · never below ${inr(r.minPrice)}` : ""}
            {r.minMarginPercent != null ? ` · ${r.minMarginPercent}% margin kept` : ""} · {r.steps} steps · max {r.maxConcessions} offers
            {r.freeShipping ? " · free delivery first" : ""}
            {!r.active ? " · off" : ""}
          </p>
        </div>
      ))}
      {rules && !rules.length && <p className="m-0 text-[12.5px] text-ink-muted">No rules yet — the assistant uses a safe default of at most 10% off in 3 steps.</p>}
      <Button icon={<Plus size={14} />} onClick={() => open(null)}>
        Add a rule
      </Button>
      <div className="mt-2">
        <p className="m-0 mb-1.5 text-[12.5px] font-medium text-ink">Try it on a product</p>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Choose a product"
          className="w-full"
          options={products.map((p) => ({ value: p.id, label: p.title }))}
          onChange={(id) => apiFetch(`/api/assistant/rules/preview/${id}`).then(setPreview).catch(() => setPreview(null))}
        />
        {preview?.moves?.length > 0 && (
          <ol className="m-0 mt-2 flex flex-col gap-1 pl-4 text-[12.5px]">
            {preview.moves.map((m) => (
              <li key={m.round}>
                {m.action === "value" ? "Add value: free delivery / similar products" : m.action === "hold" ? `Hold at ${inr(m.price)} — final` : `Offer ${inr(m.price)} (${m.discountPercent}% off)`}
              </li>
            ))}
          </ol>
        )}
      </div>
      <Modal open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText="Save rule" title="Negotiation rule" destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={save} requiredMark={false}>
          <Form.Item name="scope" label="Applies to">
            <Segmented options={[{ value: "store", label: "Whole store" }, { value: "category", label: "Category" }, { value: "product", label: "Product" }]} />
          </Form.Item>
          {scope === "category" && (
            <Form.Item name="targetId" label="Category" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="label" options={categories.map((c) => ({ value: c.id, label: c.title }))} />
            </Form.Item>
          )}
          {scope === "product" && (
            <Form.Item name="targetId" label="Product" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="label" options={products.map((p) => ({ value: p.id, label: p.title }))} />
            </Form.Item>
          )}
          <div className="grid grid-cols-2 gap-x-3">
            <Form.Item name="maxDiscountPercent" label="Max discount">
              <InputNumber min={0} max={90} addonAfter="%" className="w-full" />
            </Form.Item>
            <Form.Item name="minPrice" label="Never below (optional)">
              <InputNumber min={0} addonBefore="₹" className="w-full" />
            </Form.Item>
            <Form.Item name="minMarginPercent" label="Min margin over cost">
              <InputNumber min={0} max={500} addonAfter="%" className="w-full" />
            </Form.Item>
            <Form.Item name="steps" label="Negotiation steps">
              <InputNumber min={1} max={6} className="w-full" />
            </Form.Item>
            <Form.Item name="maxConcessions" label="Max offers per buyer">
              <InputNumber min={1} max={6} className="w-full" />
            </Form.Item>
          </div>
          <div className="flex flex-wrap gap-5">
            <Form.Item name="freeShipping" label="Offer free delivery first" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="suggestAlternatives" label="Suggest similar products" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="active" label="On" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

const MODES = [
  { value: "recommend", label: "Recommend", text: "It analyses buyers and suggests actions. You do the rest." },
  { value: "approve", label: "Approve", text: "It prepares offers and messages; nothing goes out until you approve." },
  { value: "autopilot", label: "Autopilot", text: "It sends offers and negotiates within your limits. Bigger discounts still wait for you." },
];

export function AutopilotPanel({ settings, usage, platform, onSaved }) {
  const { message } = App.useApp();
  const [s, setS] = useState(settings);
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => setS(settings), [settings]);
  useEffect(() => {
    apiFetch("/api/products?pageSize=100").then((d) => setProducts(d.products || [])).catch(() => {});
  }, []);
  async function save(patch) {
    setBusy(true);
    try {
      const { settings: next } = await apiFetch("/api/assistant/settings", { method: "PUT", body: { ...s, ...patch } });
      setS(next);
      onSaved?.(next);
      message.success(patch.paused === true ? "Emergency stop on" : patch.paused === false ? "Resumed" : "Saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  if (!s) return null;
  return (
    <div className="flex flex-col gap-4">
      <Button size="large" danger={!s.paused} type={s.paused ? "primary" : "default"} icon={s.paused ? <Play size={16} /> : <OctagonX size={16} />} loading={busy} onClick={() => save({ paused: !s.paused })} block>
        {s.paused ? "Resume the assistant" : "Emergency stop"}
      </Button>
      {!platform?.enabled && <p className="m-0 rounded-lg bg-[#FEF3F2] px-3 py-2 text-[12.5px] text-[#B42318]">The assistant is paused on Oyklane right now.</p>}
      <div className="flex flex-col gap-2">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            disabled={m.value === "autopilot" && !platform?.autopilotAllowed}
            onClick={() => save({ mode: m.value })}
            className={`rounded-xl border px-3 py-2.5 text-left transition ${s.mode === m.value ? "border-[#0078d4] bg-[#F0F7FD]" : "border-app-border bg-app-surface hover:border-[#9FC9EE]"} disabled:opacity-50`}
          >
            <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
              {m.value === "autopilot" ? <Zap size={14} /> : m.value === "approve" ? <ShieldAlert size={14} /> : <Sparkles size={14} />} {m.label}
              {s.mode === m.value && <Check size={14} className="ml-auto text-[#0078d4]" />}
            </span>
            <span className="mt-0.5 block text-[12px] text-ink-muted">{m.text}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 text-[12.5px]">
        <label>
          <span className="text-ink-muted">Messages a day</span>
          <InputNumber min={0} max={1000} value={s.dailyMessageCap} onChange={(v) => setS({ ...s, dailyMessageCap: v })} className="!mt-1 w-full" />
        </label>
        <label>
          <span className="text-ink-muted">Discount budget / month</span>
          <InputNumber min={0} value={s.monthlyDiscountBudget} onChange={(v) => setS({ ...s, monthlyDiscountBudget: v })} addonBefore="₹" className="!mt-1 w-full" />
        </label>
        <label>
          <span className="text-ink-muted">Ask me above</span>
          <InputNumber min={0} max={90} value={s.escalateOverPercent} onChange={(v) => setS({ ...s, escalateOverPercent: v })} addonAfter="% off" className="!mt-1 w-full" />
        </label>
        <label>
          <span className="text-ink-muted">Offers valid for</span>
          <InputNumber min={1} max={30} value={s.offerDays} onChange={(v) => setS({ ...s, offerDays: v })} addonAfter="days" className="!mt-1 w-full" />
        </label>
      </div>
      <label className="text-[12.5px]">
        <span className="text-ink-muted">Only these products (empty = all)</span>
        <Select mode="multiple" className="!mt-1 w-full" optionFilterProp="label" value={s.productIds} onChange={(v) => setS({ ...s, productIds: v })} options={products.map((p) => ({ value: p.id, label: p.title }))} maxTagCount="responsive" />
      </label>
      <Button type="primary" loading={busy} onClick={() => save({})}>
        Save limits
      </Button>
      <p className="m-0 text-[12px] text-ink-muted">
        This month: {inr(usage?.discountGivenThisMonth || 0)} of {inr(s.monthlyDiscountBudget)} discount used · {usage?.sentToday || 0} sent in the last 24h. Messages respect WhatsApp consent and opt-outs.
      </p>
    </div>
  );
}

export function EmptyList({ text }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-[12.5px] text-ink-muted">{text}</span>} />;
}
