"use client";

import { DatePicker, Form, Input, InputNumber, Select, Switch } from "antd";
import { Label, Note, Section, currencySign } from "./parts";
import { useAdsCoach } from "../context";

const DATE = "D MMM YYYY, h:mm a";

/** Campaign: name, objective, special ad category. */
export function CampaignForm({ spec, set, caps, advanced }) {
  const c = spec.campaign;
  const pick = (key) =>
    set((s) => ({
      ...s,
      campaign: { ...s.campaign, objective: key, bidStrategy: key !== "OUTCOME_SALES" && s.campaign.bidStrategy === "LOWEST_COST_WITH_MIN_ROAS" ? "LOWEST_COST_WITHOUT_CAP" : s.campaign.bidStrategy },
      adSets: s.adSets.map((a) => ({ ...a, goal: caps.objectives[key].goals.includes(a.goal) ? a.goal : caps.objectives[key].recommended })),
    }));
  return (
    <>
      <Section title="Campaign name">
        <Input value={c.name} maxLength={200} placeholder="e.g. Sales | Winter range | Nov 2026" onChange={(e) => set((s) => ({ ...s, campaign: { ...s.campaign, name: e.target.value } }))} aria-label="Campaign name" />
      </Section>
      <Section title="Campaign objective" description="What you want people to do when they see the ads. Ad sets optimise for a result that fits it.">
        <div role="radiogroup" aria-label="Campaign objective" className="overflow-hidden rounded-md border border-app-border">
          {Object.entries(caps.objectives).map(([key, o]) => {
            const on = c.objective === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={Boolean(o.unavailable)}
                onClick={() => pick(key)}
                className={`flex w-full items-start gap-3 border-b border-app-border px-3 py-2.5 text-left last:border-b-0 ${on ? "bg-accent-soft" : "bg-app-surface hover:bg-app-bg"} ${o.unavailable ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${on ? "border-accent" : "border-[#BCC0C4]"}`} aria-hidden="true">
                  {on && <span className="h-2 w-2 rounded-full bg-accent" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium">{o.label}</span>
                  <span className="block text-[12px] leading-snug text-ink-muted">{o.unavailable || o.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>
      {advanced && (
        <Section title="Special ad categories" description="Required for ads about credit, jobs, housing, or social issues and politics. It limits targeting. Most stores choose none.">
          <Select mode="multiple" allowClear placeholder="None" value={c.specialAdCategories} onChange={(v) => set((s) => ({ ...s, campaign: { ...s.campaign, specialAdCategories: v } }))} options={Object.entries(caps.specialCategories).map(([value, label]) => ({ value, label }))} aria-label="Special ad categories" />
        </Section>
      )}
    </>
  );
}

/** Budget and schedule (and bidding, in Advanced). */
export function BudgetForm({ spec, set, caps, advanced }) {
  const api = useAdsCoach();
  const sign = currencySign(api);
  const c = spec.campaign;
  const setC = (patch) => set((s) => ({ ...s, campaign: { ...s.campaign, ...patch } }));
  const shared = c.budgetLevel === "campaign";
  return (
    <>
      <Section
        title="Budget"
        description={shared ? "One budget for the campaign. Meta moves it to the ad sets getting the best results." : "Each ad set has its own budget, set on the ad set. Use this to test ad sets against each other fairly."}
      >
        <div className="flex items-center justify-between gap-3 rounded-md bg-app-bg px-3 py-2">
          <Label tip="Advantage campaign budget: Meta shares one budget across the ad sets, day by day. Usually the lowest cost per result.">Advantage campaign budget</Label>
          <Switch checked={shared} onChange={(on) => setC({ budgetLevel: on ? "campaign" : "adset" })} aria-label="Advantage campaign budget" />
        </div>
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <Form.Item label="Budget type" className="!mb-0">
            <Select value={c.budgetType} onChange={(budgetType) => setC({ budgetType })} options={[{ value: "daily", label: "Daily budget" }, { value: "lifetime", label: "Lifetime budget" }]} />
          </Form.Item>
          {shared ? (
            <Form.Item label={<Label tip={c.budgetType === "daily" ? "An average per day. Some days Meta spends up to 75% more, balanced across the week." : "Spread over the whole schedule. Needs an end date."}>Amount</Label>} className="!mb-0">
              <InputNumber className="!w-full" min={1} prefix={sign} value={c.budget} onChange={(budget) => setC({ budget })} />
            </Form.Item>
          ) : (
            <Note>Set each ad set&apos;s {c.budgetType === "daily" ? "daily" : "lifetime"} budget on the ad set.</Note>
          )}
        </div>
        {shared && c.budgetType === "daily" && Number(c.budget) < caps.minDaily && <Note tone="warn">Under {sign}{caps.minDaily} a day usually delivers very little.</Note>}
      </Section>
      <Section title="Schedule">
        <div className="grid gap-3 sm:grid-cols-2">
          <Form.Item label="Start date" className="!mb-0" extra="Empty: as soon as it's turned on.">
            <DatePicker showTime={{ format: "h:mm a" }} format={DATE} className="w-full" onChange={(d) => setC({ startTime: d ? d.toISOString() : null })} />
          </Form.Item>
          <Form.Item label={c.budgetType === "lifetime" ? "End date" : "End date (optional)"} className="!mb-0">
            <DatePicker showTime={{ format: "h:mm a" }} format={DATE} className="w-full" onChange={(d) => setC({ endTime: d ? d.toISOString() : null })} />
          </Form.Item>
        </div>
      </Section>
      {advanced && (
        <Section title="Bid strategy" description={caps.bidStrategies[c.bidStrategy]?.hint}>
          <Select value={c.bidStrategy} onChange={(bidStrategy) => setC({ bidStrategy })} options={Object.entries(caps.bidStrategies).map(([value, b]) => ({ value, label: b.label, disabled: value === "LOWEST_COST_WITH_MIN_ROAS" && c.objective !== "OUTCOME_SALES" }))} aria-label="Bid strategy" />
          {["COST_CAP", "LOWEST_COST_WITH_BID_CAP"].includes(c.bidStrategy) && (
            <Form.Item label={c.bidStrategy === "COST_CAP" ? "Cost per result goal" : "Bid cap"} className="!mb-0">
              <InputNumber prefix={sign} min={1} value={c.bidAmount} onChange={(bidAmount) => setC({ bidAmount })} />
            </Form.Item>
          )}
          {c.bidStrategy === "LOWEST_COST_WITH_MIN_ROAS" && (
            <Form.Item label="ROAS goal" className="!mb-0" extra={`2 means ${sign}2 of sales for every ${sign}1 spent.`}>
              <InputNumber min={0.1} step={0.1} value={c.roasFloor} onChange={(roasFloor) => setC({ roasFloor })} />
            </Form.Item>
          )}
        </Section>
      )}
    </>
  );
}
