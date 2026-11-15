"use client";

import { useEffect, useState } from "react";
import { Form, Input, Card, Alert, App, Switch, Button, Select, Tabs } from "antd";
import { Search, ShoppingBag } from "lucide-react";
import { PageHeader, SaveBar } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { ImageUploadField } from "@/components/ImageUploadField";
import { storefrontUrlFor } from "@/lib/storefront";

const TITLE_MAX = 70;
const DESCRIPTION_MAX = 160;

/** Online Store ▸ Preferences: how the home page appears in Google and when
 * the store's link is shared on WhatsApp, Instagram or X. Product,
 * collection and blog pages build their own listing from their content. */
export function PreferencesForm({ store, seo, canEdit }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const title = Form.useWatch("title", form);
  const description = Form.useWatch("description", form);
  const image = Form.useWatch("image", form);
  const favicon = Form.useWatch("favicon", form);
  const url = storefrontUrlFor(store);
  const host = url.replace(/^https?:\/\//, "").split("/")[0];

  async function save(values) {
    setSaving(true);
    try {
      await apiFetch("/api/store", { method: "PATCH", body: { settings: { seo: values } } });
      message.success("Preferences saved");
      setDirty(false);
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  // The open tab lives in the URL (?tab=cart), so a link can open it.
  const [tab, setTab] = useState("seo");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "cart") setTab("cart");
  }, []);
  const pickTab = (t) => {
    setTab(t);
    const u = new URL(window.location.href);
    if (t === "seo") u.searchParams.delete("tab");
    else u.searchParams.set("tab", t);
    window.history.replaceState(null, "", u);
  };

  const shownTitle = title || store.name;
  const shownDescription = description || `Shop ${store.name} online.`;

  return (
    <div>
      <PageHeader title="Preferences" subtitle="How your store shows up in search and when its link is shared, and what the cart drawer shows shoppers" />
      {!canEdit && <Alert className="mb-4" type="info" showIcon message="Only the store owner or an admin can change these." />}

      <Tabs
        activeKey={tab}
        onChange={pickTab}
        className="[&_.ant-tabs-nav]:!mb-6"
        items={[
          { key: "seo", label: <span className="inline-flex items-center gap-2"><Search size={15} aria-hidden="true" />Search &amp; sharing</span> },
          { key: "cart", label: <span className="inline-flex items-center gap-2"><ShoppingBag size={15} aria-hidden="true" />Cart drawer</span> },
        ]}
      />

      {tab === "cart" ? (
        <CartPreferences store={store} canEdit={canEdit} />
      ) : (
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        disabled={!canEdit}
        initialValues={{ title: seo.title || "", description: seo.description || "", keywords: Array.isArray(seo.keywords) ? seo.keywords : [], image: seo.image || "", favicon: seo.favicon || "" }}
        onValuesChange={() => setDirty(true)}
        onFinish={save}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6 min-w-0">
            <Card size="small" title="Title and meta description">
              <p className="text-sm text-ink-muted mt-0 mb-4">
                Used for your home page. Aim for a title under {TITLE_MAX} characters and a description under {DESCRIPTION_MAX} — search engines cut off the rest.
              </p>
              <Form.Item name="title" label="Home page title">
                <Input maxLength={TITLE_MAX} showCount placeholder={store.name} />
              </Form.Item>
              <Form.Item name="description" label="Meta description">
                <Input.TextArea rows={3} maxLength={DESCRIPTION_MAX} showCount placeholder="What you sell, in a sentence or two — e.g. Single-origin spices from Meghalaya, packed fresh and shipped across India." />
              </Form.Item>
              <Form.Item
                name="keywords"
                label="Keywords"
                className="mb-0"
                extra="What shoppers type to find stores like yours — press Enter after each. Up to 15."
                rules={[{ validator: (_, v) => (!v || v.length <= 15 ? Promise.resolve() : Promise.reject(new Error("Keep it to 15 keywords"))) }]}
              >
                <Select mode="tags" tokenSeparators={[","]} open={false} suffixIcon={null} maxTagTextLength={40} placeholder="e.g. handmade kurtas, cotton sarees, ethnic wear online" />
              </Form.Item>
            </Card>

            <Card size="small" title="Social sharing image">
              <p className="text-sm text-ink-muted mt-0 mb-4">
                Shown when your store's link is shared. 1200 × 630 px works best. Without one, your logo or the first product photo is used.
              </p>
              <Form.Item name="image" className="mb-0">
                <ImageUploadField aspect="1200 / 630" label="Upload share image" />
              </Form.Item>
            </Card>
          </div>

          <div className="flex flex-col gap-6 min-w-0">
            <Card size="small" title="Favicon">
              <p className="text-sm text-ink-muted mt-0 mb-4">
                The small icon on the browser tab and in bookmarks. Use a square image, at least 96 × 96 px (512 × 512 is ideal) — PNG works best.
              </p>
              <Form.Item name="favicon" className="mb-3">
                <ImageUploadField aspect="1 / 1" label="Upload favicon" />
              </Form.Item>
              <div className="flex items-center gap-2 rounded-t-lg border border-b-0 border-app-border bg-app-bg px-3 py-2 max-w-[260px]" aria-hidden="true">
                {favicon ? <img src={favicon} alt="" className="w-4 h-4 rounded-sm object-cover" /> : <span className="w-4 h-4 rounded-sm bg-app-border" />}
                <span className="text-xs text-ink truncate">{shownTitle}</span>
              </div>
            </Card>
            <Card size="small" title="Search result preview">
              <div className="rounded-lg border border-app-border bg-white p-3">
                <p className="m-0 text-xs text-ink-muted truncate">{host}</p>
                <p className="m-0 mt-0.5 text-[16px] leading-snug text-[#1a0dab] line-clamp-2">{shownTitle}</p>
                <p className="m-0 mt-1 text-[13px] leading-snug text-ink-muted line-clamp-3">{shownDescription}</p>
              </div>
            </Card>
            <Card size="small" title="Link preview">
              <div className="rounded-lg border border-app-border overflow-hidden bg-white">
                <div className="bg-app-bg" style={{ aspectRatio: "1200 / 630" }}>
                  {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : null}
                </div>
                <div className="p-3">
                  <p className="m-0 text-[11px] uppercase tracking-wide text-ink-muted truncate">{host}</p>
                  <p className="m-0 text-sm font-semibold text-ink truncate">{shownTitle}</p>
                  <p className="m-0 text-xs text-ink-muted line-clamp-2">{shownDescription}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {canEdit && <SaveBar dirty={dirty} saving={saving} onDiscard={() => (form.resetFields(), setDirty(false))} />}
      </Form>
      )}
    </div>
  );
}

/** Cart drawer extras — switches save at once; the strip text on Save. */
const CART_SWITCHES = [
  ["showOffers", "Offer tiers", "A progress bar to your public coupon codes that need a minimum order (e.g. ₹100 off over ₹999)."],
  ["showCoupon", "Coupons", "A box to enter a code, plus “View all offers” with your public codes."],
  ["showSavings", "Savings", "The MRP crossed out, the % off and “₹… saved so far”, from compare-at prices and the coupon."],
  ["showPayIcons", "UPI app icons", "GPay, PhonePe and Paytm marks on the checkout button."],
  ["viewCartButton", "“View cart” button", "Off: shoppers go straight from the cart to checkout."],
];
function CartPreferences({ store, canEdit }) {
  const { message } = App.useApp();
  const c = store.settings?.cart || {};
  const [on, setOn] = useState({ showOffers: c.showOffers !== false, showCoupon: c.showCoupon !== false, showSavings: c.showSavings !== false, showPayIcons: c.showPayIcons !== false, viewCartButton: Boolean(c.viewCartButton) });
  const [strip, setStrip] = useState(c.announcement || "");
  const [busy, setBusy] = useState(null);
  async function save(patch, key, ok) {
    setBusy(key);
    try {
      await apiFetch("/api/store", { method: "PATCH", body: { settings: { cart: patch } } });
      message.success(ok);
      return true;
    } catch (err) {
      message.error(err.message);
      return false;
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
        <Card size="small" title="Strip under the header">
          <p className="m-0 mb-3 text-sm text-ink-muted">A short line every shopper sees at the top of the cart, like “Same day dispatch” or “Free gift over ₹1,499”. Leave it empty to hide it.</p>
          <div className="flex gap-2">
            <Input value={strip} onChange={(e) => setStrip(e.target.value)} maxLength={80} showCount placeholder="Same day dispatch" disabled={!canEdit} />
            <Button type="primary" onClick={() => save({ announcement: strip.trim() }, "strip", strip.trim() ? "Strip saved" : "Strip hidden")} loading={busy === "strip"} disabled={!canEdit || strip.trim() === (c.announcement || "")}>
              Save
            </Button>
          </div>
        </Card>
        <Card size="small" title="What the cart shows" extra={<span className="text-xs text-ink-muted">Changes save straight away</span>} styles={{ body: { padding: 0 } }}>
          <ul className="m-0 list-none p-0">
            {CART_SWITCHES.map(([key, label, help]) => (
              <li key={key} className="flex items-center justify-between gap-6 border-b border-app-border px-4 py-3.5 last:border-b-0">
                <div className="min-w-0">
                  <p className="m-0 text-sm font-medium text-ink">{label}</p>
                  <p className="m-0 mt-0.5 text-[13px] text-ink-muted">{help}</p>
                </div>
                <Switch
                  checked={on[key]}
                  loading={busy === key}
                  disabled={!canEdit}
                  aria-label={label}
                  onChange={async (v) => {
                    if (await save({ [key]: v }, key, `${label} ${v ? "shown" : "hidden"} in the cart`)) setOn((o) => ({ ...o, [key]: v }));
                  }}
                />
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card size="small" title="Preview" className="lg:sticky lg:top-24">
        <CartSketch on={on} strip={strip.trim()} />
        <p className="m-0 mt-3 text-xs text-ink-muted">A sketch of your cart drawer with these settings. Your theme's fonts and colours apply on the store.</p>
      </Card>
    </div>
  );
}

/** A small drawing of the cart drawer that follows the switches. */
function CartSketch({ on, strip }) {
  const bar = "h-2 rounded bg-app-border";
  return (
    <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-xl border border-app-border bg-white text-[11px] text-ink shadow-card" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-app-border px-3 py-2.5 font-semibold">
        Your cart <span className="text-ink-muted">✕</span>
      </div>
      {strip && <div className="truncate bg-[#111] px-3 py-1.5 text-center text-[10.5px] text-white">{strip}</div>}
      {on.showOffers && (
        <div className="border-b border-app-border px-3 py-2.5">
          <p className="m-0 mb-1.5 text-[10.5px] text-ink-muted">Add ₹320 more for ₹100 off</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-app-bg">
            <div className="h-full w-3/5 rounded-full bg-[#16a34a]" />
          </div>
        </div>
      )}
      {[0, 1].map((k) => (
        <div key={k} className="flex gap-2.5 border-b border-app-border px-3 py-2.5">
          <span className="h-10 w-10 shrink-0 rounded-md bg-app-bg" />
          <span className="flex flex-1 flex-col gap-1.5 pt-0.5">
            <span className={`${bar} w-3/4`} />
            <span className="flex items-center gap-1.5">
              <b className="font-semibold">₹499</b>
              {on.showSavings && (
                <>
                  <s className="text-ink-subtle">₹699</s>
                  <span className="text-[#16a34a]">29% off</span>
                </>
              )}
            </span>
          </span>
        </div>
      ))}
      {on.showCoupon && (
        <div className="flex items-center gap-2 border-b border-app-border px-3 py-2.5">
          <span className="flex-1 rounded-md border border-app-border px-2 py-1.5 text-ink-subtle">Coupon code</span>
          <span className="font-semibold text-accent">Apply</span>
        </div>
      )}
      <div className="flex flex-col gap-2 px-3 py-3">
        {on.showSavings && <p className="m-0 text-center text-[10.5px] text-[#16a34a]">₹400 saved so far</p>}
        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-[#111] py-2.5 font-semibold text-white">
          Checkout · ₹998
          {on.showPayIcons && <span className="ml-1 flex gap-0.5">{["#5f6368", "#5f259f", "#00baf2"].map((col) => <i key={col} className="h-3 w-3 rounded-full" style={{ background: col }} />)}</span>}
        </div>
        {on.viewCartButton && <div className="rounded-lg border border-app-border py-2 text-center font-medium">View cart</div>}
      </div>
    </div>
  );
}
