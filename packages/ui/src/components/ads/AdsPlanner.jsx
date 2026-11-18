"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, App, Button, Form, Input, InputNumber, Modal, Radio, Segmented, Select, Spin, Switch, Tag } from "antd";
import { ArrowLeft, ImageOff } from "lucide-react";
import { useAdsCoach } from "./context";

const GOALS = [
  { value: "sales", label: "Sales", hint: "Find people likely to buy. Works best with the Meta Pixel on the store." },
  { value: "whatsapp", label: "WhatsApp chats", hint: "For products people like to ask about before buying." },
  { value: "traffic", label: "Store visits", hint: "More visitors for less. They may not buy yet." },
  { value: "leads", label: "Leads", hint: "Collect enquiries on the website or on WhatsApp." },
  { value: "awareness", label: "Awareness", hint: "Show the brand to as many people as possible." },
];
const TESTS = [
  { value: "none", label: "No test", hint: "2–3 ads in each ad set; Meta shows the best one more." },
  { value: "audience", label: "Test audiences", hint: "The same ads to different audiences, with equal budgets." },
  { value: "creative", label: "Test ads", hint: "The same audience, a different ad in each version." },
];
// The ad account's home market, as the starting location.
const HOME = { INR: ["IN", "India"], USD: ["US", "United States"], GBP: ["GB", "United Kingdom"], EUR: ["DE", "Germany"], JPY: ["JP", "Japan"], CNY: ["CN", "China"], SAR: ["SA", "Saudi Arabia"], AED: ["AE", "United Arab Emirates"], SGD: ["SG", "Singapore"], AUD: ["AU", "Australia"], CAD: ["CA", "Canada"] };
const START = { INR: 1000, USD: 20, EUR: 20, GBP: 15, JPY: 3000, CNY: 150, SAR: 75, AED: 75, SGD: 25, AUD: 30, CAD: 25 };

function LocationSelect({ value, onChange }) {
  const api = useAdsCoach();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);
  const search = (q) => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) return;
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const d = await api.request(`/targeting/search?type=location&q=${encodeURIComponent(q)}`);
        setOptions((d.results || []).map((x) => ({ value: `${x.type}:${x.key}`, label: x.label || x.name, name: x.name })));
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };
  return <Select mode="multiple" labelInValue showSearch filterOption={false} onSearch={search} notFoundContent={loading ? <Spin size="small" /> : null} options={options} value={value} onChange={onChange} placeholder="Search a country, state or city" aria-label="Where to show the ads" />;
}

/** Selected locations → the plan's countries, regions and cities. */
function splitPlaces(list = []) {
  const out = { countries: [], regions: [], cities: [] };
  for (const item of list) {
    const [type, ...rest] = String(item.value).split(":");
    const key = rest.join(":");
    const name = String(item.label).split(",")[0];
    if (type === "country") out.countries.push(key);
    else if (type === "region") out.regions.push({ key, name, label: String(item.label) });
    else if (type === "city") out.cities.push({ key, name, label: String(item.label) });
  }
  return out;
}

/**
 * Plan with AI: a few answers → a whole campaign (ad sets per audience,
 * ads with text and product photos, names, the budget split and an
 * optional A/B test), shown for review, then opened in the builder as a
 * draft. Nothing is created at Meta until it's published from there.
 */
export function AdsPlanner({ open, onClose, onOpen }) {
  const api = useAdsCoach();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const cur = api.currency || "INR";
  const home = HOME[cur] || HOME.INR;

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError(null);
    if (!products.length) {
      Promise.resolve(api.products?.())
        .then((list) => setProducts(list || []))
        .catch(() => {});
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function make(v) {
    setBusy(true);
    setError(null);
    try {
      const out = await api.request("/coach/plan", {
        method: "POST",
        body: {
          goal: v.goal,
          dailyBudget: Number(v.dailyBudget),
          days: Number(v.days) || 0,
          productIds: v.productIds || [],
          audience: v.audience || undefined,
          notes: v.notes || undefined,
          test: v.test,
          useProductImages: v.useProductImages !== false,
          locations: splitPlaces(v.places),
        },
      });
      setResult(out);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function openInBuilder() {
    setOpening(true);
    try {
      const { draft } = await api.request("/drafts", { method: "POST", body: { data: result.spec } });
      message.success("Plan saved as a draft");
      onOpen(draft.id);
    } catch (err) {
      message.error(err.message);
    } finally {
      setOpening(false);
    }
  }

  const spec = result?.spec;
  const shared = spec?.campaign?.budgetLevel === "campaign";
  const letters = new Map((spec?.test?.variants || []).map((v, i) => [v.key, String.fromCharCode(65 + i)]));

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width="min(760px, 100vw)"
      title={
        result ? "Campaign plan" : "Plan a campaign"
      }
      footer={
        result ? (
          <div className="flex flex-wrap justify-between gap-2">
            <Button icon={<ArrowLeft size={14} aria-hidden="true" />} onClick={() => setResult(null)}>
              Change answers
            </Button>
            <Button type="primary" loading={opening} onClick={openInBuilder}>
              Open in builder
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" loading={busy} onClick={() => form.submit()}>
              {busy ? "Planning…" : "Create plan"}
            </Button>
          </div>
        )
      }
      destroyOnHidden={false}
    >
      <div className={result ? "hidden" : ""}>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={make} initialValues={{ goal: "sales", dailyBudget: START[cur] || 1000, days: 0, test: "none", useProductImages: true, places: [{ value: `country:${home[0]}`, label: home[1] }] }}>
          <Form.Item name="goal" label="What should the ads do?">
            <Radio.Group className="!flex w-full flex-col overflow-hidden rounded-md border border-app-border">
              {GOALS.map(({ value, label, hint }) => (
                <Radio key={value} value={value} className="!m-0 border-b border-app-border px-3 py-2 last:border-b-0">
                  <span className="block text-[13.5px] font-medium">{label}</span>
                  <span className="block text-[12px] text-ink-muted">{hint}</span>
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="dailyBudget" label="Budget a day" rules={[{ required: true, message: "Enter a daily budget." }]} extra="Spend it for at least a week without changes.">
              <InputNumber className="!w-full" min={1} max={10000000} prefix={cur} />
            </Form.Item>
            <Form.Item name="days" label="Run for">
              <Segmented block options={[{ value: 0, label: "Ongoing" }, { value: 7, label: "7 days" }, { value: 14, label: "14 days" }, { value: 30, label: "30 days" }]} />
            </Form.Item>
          </div>
          <Form.Item name="productIds" label="Products to advertise" extra="Leave empty and the best sellers are used.">
            <Select mode="multiple" maxCount={5} allowClear showSearch optionFilterProp="label" placeholder="Best sellers" options={products.map((p) => ({ value: p.id, label: p.title }))} />
          </Form.Item>
          <Form.Item name="places" label="Where" rules={[{ required: true, message: "Choose at least one place." }]}>
            <LocationSelect />
          </Form.Item>
          <Form.Item name="audience" label="Who buys (optional)" extra="In your own words. The AI turns it into Meta audiences.">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} maxLength={500} placeholder="e.g. Working professionals 25–40 who buy gifts online" />
          </Form.Item>
          <Form.Item name="test" label="A/B test">
            <Radio.Group className="flex flex-col gap-1">
              {TESTS.map((t) => (
                <Radio key={t.value} value={t.value}>
                  <span className="text-sm">{t.label}</span> <span className="text-xs text-ink-muted">— {t.hint}</span>
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="useProductImages" label="Product photos" valuePropName="checked" extra="Adds each product's main photo to the media library.">
              <Switch />
            </Form.Item>
            <Form.Item name="notes" label="Anything else (optional)">
              <Input maxLength={500} placeholder="e.g. Launching a new range this week" />
            </Form.Item>
          </div>
        </Form>
        {error && <Alert type="error" showIcon message="Couldn't make the plan" description={error} />}
        {busy && <p className="m-0 mt-2 text-xs text-ink-muted">Reading the ad account, choosing audiences and writing ads — this takes up to a minute.</p>}
      </div>

      {result && (
        <div className="flex flex-col gap-4">
          <Alert type="info" showIcon message={result.plan.summary} description={result.plan.source === "ai" ? "Audiences and ad text are AI suggestions. Check them in the builder before publishing." : "AI writing isn't switched on, so the ad text is plain. Edit it in the builder."} />
          {result.plan.warnings.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message="Before publishing"
              description={
                <ul className="m-0 pl-4">
                  {result.plan.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              }
            />
          )}
          <section>
            <h3 className="m-0 mb-1 text-sm font-semibold">Why this structure</h3>
            <ul className="m-0 pl-4 text-sm text-ink-muted">
              {result.plan.rationale.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-lg border border-app-border">
            <div className="border-b border-app-border bg-app-bg px-3 py-2">
              <p className="m-0 text-sm font-semibold">{spec.campaign.name}</p>
              <p className="m-0 text-xs text-ink-muted">
                Campaign · {shared ? `${api.money(spec.campaign.budget)} a day, shared by the ad sets` : "a budget on each ad set"}
                {spec.campaign.endTime ? ` · ends ${new Date(spec.campaign.endTime).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}
              </p>
            </div>
            <ul className="m-0 list-none p-0">
              {spec.adSets.map((s) => (
                <li key={s.key} className="border-b border-app-border px-3 py-2.5 last:border-b-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {letters.has(s.key) && <Tag color="blue" className="!m-0">Version {letters.get(s.key)}</Tag>}
                    <span className="text-sm font-medium">{s.name}</span>
                    {!shared && <span className="text-xs text-ink-muted">{api.money(s.budget)} a day</span>}
                  </div>
                  {s.why && <p className="m-0 mt-0.5 text-xs text-ink-muted">{s.why}</p>}
                  <ul className="m-0 mt-2 grid list-none gap-2 p-0 sm:grid-cols-2">
                    {s.ads.map((a) => (
                      <li key={a.key} className="flex gap-2 rounded-md border border-app-border p-2">
                        {a.imagePreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.imagePreview} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                        ) : (
                          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-app-bg text-ink-subtle" title="Choose an image in the builder">
                            <ImageOff size={16} aria-label="No image yet" />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium">{a.name}</span>
                          <span className="line-clamp-2 block text-xs text-ink-muted">{a.primaryText}</span>
                          {a.headline && <span className="block truncate text-xs">{a.headline}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
          {result.plan.tips?.length > 0 && (
            <section>
              <h3 className="m-0 mb-1 text-sm font-semibold">Tips</h3>
              <ul className="m-0 pl-4 text-sm text-ink-muted">
                {result.plan.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
          )}
          <p className="m-0 text-xs text-ink-muted">Opening it saves a draft. You can change anything in the builder; nothing goes to Meta until you publish, and it publishes paused.</p>
        </div>
      )}
    </Modal>
  );
}
