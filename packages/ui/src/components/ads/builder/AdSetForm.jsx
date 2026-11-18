"use client";

import { Checkbox, Collapse, DatePicker, Form, Input, InputNumber, Radio, Segmented, Select, Space, Switch } from "antd";
import { Label, Note, SearchSelect, Section, currencySign } from "./parts";
import { useAdsCoach } from "../context";

const COUNTRY = { IN: "India", US: "United States", GB: "United Kingdom", AE: "United Arab Emirates", SA: "Saudi Arabia", DE: "Germany", FR: "France", JP: "Japan", CN: "China", SG: "Singapore", AU: "Australia", CA: "Canada" };

/** One ad set: what it optimises for, its budget, who sees it and where. */
export function AdSetForm({ adSet, update, caps, campaign, advanced }) {
  const api = useAdsCoach();
  const sign = currencySign(api);
  const t = adSet.targeting;
  const setT = (patch) => update({ targeting: { ...t, ...patch } });
  const obj = caps.objectives[campaign.objective];
  const goal = caps.goals[adSet.goal];
  const locations = [...(t.countries || []).map((c) => ({ key: c, name: COUNTRY[c] || c, type: "country", label: `${COUNTRY[c] || c} (country)` })), ...(t.regions || []), ...(t.cities || [])];
  const placements = adSet.placements;
  const setP = (patch) => update({ placements: { ...placements, ...patch } });
  return (
    <>
      <Section title="Ad set name">
        <Input value={adSet.name} onChange={(e) => update({ name: e.target.value })} maxLength={200} aria-label="Ad set name" />
      </Section>

      <Section title="Performance goal" description="The result Meta looks for when it chooses who sees the ads.">
        <Select value={adSet.goal} onChange={(g) => update({ goal: g })} options={(obj?.goals || []).map((g) => ({ value: g, label: `${caps.goals[g].label}${g === obj.recommended ? " (recommended)" : ""}`, disabled: caps.goals[g].needsPixel && !caps.pixels.length }))} aria-label="Performance goal" />
        {goal?.needsPixel && !caps.pixels.length && <Note tone="warn">Needs a Meta Pixel on the store first.</Note>}
        {goal?.destination === "WHATSAPP" && <Note>Ads open a WhatsApp chat with the business. The Facebook Page must be linked to its WhatsApp Business number.</Note>}
        {goal?.needsPixel && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Form.Item label="Pixel" className="!mb-0">
              <Select value={adSet.pixelId} onChange={(pixelId) => update({ pixelId })} options={caps.pixels.map((p) => ({ value: p.id, label: `${p.name}${p.active ? "" : " (no activity this week)"}` }))} />
            </Form.Item>
            <Form.Item label="Conversion event" className="!mb-0">
              <Input disabled value={goal.event === "PURCHASE" ? "Purchase" : goal.event === "ADD_TO_CART" ? "Add to cart" : "Lead"} />
            </Form.Item>
          </div>
        )}
      </Section>

      {campaign.budgetLevel === "adset" && (
        <Section title="Budget">
          <Form.Item label={campaign.budgetType === "daily" ? "Daily budget" : "Lifetime budget"} className="!mb-0">
            <InputNumber prefix={sign} min={1} value={adSet.budget} onChange={(budget) => update({ budget })} />
          </Form.Item>
        </Section>
      )}

      <Section title="Audience" description="Who can see the ads. Meta finds the people most likely to get the result within it.">
        <Form.Item label="Locations" className="!mb-0">
          <SearchSelect
            type="location"
            placeholder="Search a country, state or city"
            value={locations}
            onChange={(list) =>
              setT({
                countries: list.filter((l) => l.type === "country").map((l) => l.key || l.country),
                regions: list.filter((l) => l.type === "region").map((l) => ({ key: l.key, name: l.name, label: l.label })),
                cities: list.filter((l) => l.type === "city").map((l) => ({ key: l.key, name: l.name, label: l.label, radius: 10 })),
              })
            }
          />
        </Form.Item>
        <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr]">
          <Form.Item label="Age" className="!mb-0">
            <Space.Compact>
              <InputNumber min={18} max={65} value={t.ageMin} onChange={(ageMin) => setT({ ageMin })} aria-label="Minimum age" style={{ width: 72 }} />
              <InputNumber min={18} max={65} value={t.ageMax} onChange={(ageMax) => setT({ ageMax })} aria-label="Maximum age" style={{ width: 72 }} addonAfter={t.ageMax === 65 ? "+" : null} />
            </Space.Compact>
          </Form.Item>
          <Form.Item label="Gender" className="!mb-0">
            <Segmented value={t.genders.length === 1 ? String(t.genders[0]) : "all"} onChange={(v) => setT({ genders: v === "all" ? [] : [Number(v)] })} options={[{ value: "all", label: "All" }, { value: "2", label: "Women" }, { value: "1", label: "Men" }]} />
          </Form.Item>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md bg-app-bg px-3 py-2">
          <Label tip={t.advantageAudience ? "Meta may also show ads beyond these ages and interests when it finds likely buyers. Usually cheaper." : "Ads stay strictly within these choices."}>Advantage+ audience</Label>
          <Switch checked={t.advantageAudience} onChange={(advantageAudience) => setT({ advantageAudience })} aria-label="Advantage+ audience" />
        </div>
        <Form.Item label={<Label tip="Leave empty to let Meta find buyers. Often works best with a Pixel.">Detailed targeting (optional)</Label>} className="!mb-0">
          <SearchSelect type="interest" placeholder="Search interests, behaviours or demographics" value={t.interests} onChange={(interests) => setT({ interests: interests.map((i) => ({ id: i.id || i.key, name: i.name })) })} />
        </Form.Item>
        {advanced && (
          <Collapse
            size="small"
            items={[
              {
                key: "more",
                label: "More audience options",
                children: (
                  <div className="flex flex-col gap-3">
                    <Form.Item label="Custom audiences" className="!mb-0" extra={!caps.audiences.length ? "None yet. Create customer lists or website visitors in Meta Ads Manager ▸ Audiences." : "Lookalike audiences are listed here too."}>
                      <Select mode="multiple" allowClear value={t.customAudiences.map((a) => a.id)} onChange={(ids) => setT({ customAudiences: ids.map((id) => ({ id })) })} options={caps.audiences.map((a) => ({ value: a.id, label: `${a.name} · ${a.type?.toLowerCase()} · ${a.size}${a.ready ? "" : " (not ready)"}`, disabled: !a.ready }))} />
                    </Form.Item>
                    <Form.Item label="Exclude audiences" className="!mb-0" extra="For example past buyers, so the ads reach new people.">
                      <Select mode="multiple" allowClear value={t.excludedAudiences.map((a) => a.id)} onChange={(ids) => setT({ excludedAudiences: ids.map((id) => ({ id })) })} options={caps.audiences.map((a) => ({ value: a.id, label: a.name }))} />
                    </Form.Item>
                    <Form.Item label="Languages" className="!mb-0">
                      <SearchSelect type="locale" placeholder="Any language" value={t.locales} onChange={(locales) => setT({ locales: locales.map((l) => ({ key: l.key, name: l.name })) })} />
                    </Form.Item>
                    <Form.Item label="Exclude states or cities" className="!mb-0">
                      <SearchSelect type="location" placeholder="Search to exclude" value={[...(t.excludedRegions || []), ...(t.excludedCities || [])]} onChange={(list) => setT({ excludedRegions: list.filter((l) => l.type === "region"), excludedCities: list.filter((l) => l.type === "city").map((l) => ({ ...l, radius: 10 })) })} />
                    </Form.Item>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Form.Item label="Ad set start (instead of the campaign's)" className="!mb-0">
                        <DatePicker showTime={{ format: "h:mm a" }} format="D MMM, h:mm a" className="w-full" onChange={(d) => update({ startTime: d ? d.toISOString() : null })} />
                      </Form.Item>
                      <Form.Item label="Ad set end" className="!mb-0">
                        <DatePicker showTime={{ format: "h:mm a" }} format="D MMM, h:mm a" className="w-full" onChange={(d) => update({ endTime: d ? d.toISOString() : null })} />
                      </Form.Item>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Section>

      <Section title="Placements" description="Where the ads appear across Facebook, Instagram, Messenger and Audience Network.">
        <Radio.Group value={placements.mode} onChange={(e) => setP({ mode: e.target.value })} className="flex flex-col gap-2">
          <Radio value="automatic">
            <span className="text-[13.5px] font-medium">Advantage+ placements (recommended)</span>
            <span className="block text-[12px] text-ink-muted">Meta shows the ads where they&apos;re likely to perform best.</span>
          </Radio>
          <Radio value="manual" disabled={!advanced}>
            <span className="text-[13.5px] font-medium">Manual placements</span>
            <span className="block text-[12px] text-ink-muted">{advanced ? "Choose the platforms and positions yourself." : "Switch to Advanced to choose them."}</span>
          </Radio>
        </Radio.Group>
        {placements.mode === "manual" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Checkbox.Group value={placements.platforms} onChange={(platforms) => setP({ platforms })} options={[{ value: "facebook", label: "Facebook" }, { value: "instagram", label: "Instagram" }, { value: "messenger", label: "Messenger" }, { value: "audience_network", label: "Audience Network", disabled: goal?.destination === "WHATSAPP" }]} />
            <Select mode="multiple" placeholder="Devices: all" value={placements.devices} onChange={(devices) => setP({ devices })} options={[{ value: "mobile", label: "Mobile" }, { value: "desktop", label: "Desktop" }]} />
            {placements.platforms.includes("facebook") && <Select mode="multiple" placeholder="Facebook: all positions" value={placements.facebook} onChange={(facebook) => setP({ facebook })} options={caps.placements.facebook.map((v) => ({ value: v, label: v.replace(/_/g, " ") }))} />}
            {placements.platforms.includes("instagram") && <Select mode="multiple" placeholder="Instagram: all positions" value={placements.instagram} onChange={(instagram) => setP({ instagram })} options={caps.placements.instagram.map((v) => ({ value: v, label: v.replace(/_/g, " ") }))} />}
          </div>
        )}
      </Section>
    </>
  );
}
