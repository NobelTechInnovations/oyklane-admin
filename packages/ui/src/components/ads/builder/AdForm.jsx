"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Card, Form, Input, Modal, Segmented, Select } from "antd";
import { Film, ImageIcon, PenLine, Plus, Trash2 } from "lucide-react";
import { useAdsCoach } from "../context";
import { MediaPicker } from "./Media";
import { Label, Note, Section } from "./parts";
import { ctaLabel, rid } from "./model";

/** The store's products, for product links and text suggestions (loaded once). */
function useProducts() {
  const api = useAdsCoach();
  const [products, setProducts] = useState(null);
  useEffect(() => {
    let live = true;
    Promise.resolve(api.products?.())
      .then((list) => live && setProducts(list || []))
      .catch(() => live && setProducts([]));
    return () => {
      live = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return products;
}

const thumbOf = (p) => p?.images?.[0]?.url || null;

/** Text suggestions for this ad, written from a product's real details. */
function SuggestText({ open, onClose, onUse, goal, products }) {
  const api = useAdsCoach();
  const { message } = App.useApp();
  const [productId, setProductId] = useState(null);
  const [angle, setAngle] = useState("");
  const [ideas, setIdeas] = useState(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      setIdeas((await api.request("/ai/copy", { method: "POST", body: { productId, angle, goal } })).variations);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open={open} onCancel={onClose} title="Text suggestions" footer={null} width="min(720px, 100vw)">
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Select showSearch allowClear placeholder="Product (optional)" value={productId} onChange={setProductId} optionFilterProp="label" options={(products || []).map((p) => ({ value: p.id, label: p.title }))} />
        <Input placeholder="Angle, e.g. gifting, freshness" value={angle} onChange={(e) => setAngle(e.target.value)} />
        <Button type="primary" loading={busy} onClick={run}>
          Suggest
        </Button>
      </div>
      <p className="mb-3 text-xs text-ink-muted">Written by AI from the product&apos;s real details, following Meta&apos;s advertising standards. Read and edit before using.</p>
      <div className="flex flex-col gap-2">
        {(ideas || []).map((v, i) => (
          <Card
            key={i}
            size="small"
            title={<span className="text-[13px]">{v.angle}</span>}
            extra={
              <Button size="small" onClick={() => onUse(v)}>
                Use this
              </Button>
            }
          >
            <p className="m-0 text-sm">{v.primaryText}</p>
            <p className="m-0 mt-1 text-sm font-semibold">{v.headline}</p>
            {v.description && <p className="m-0 text-xs text-ink-muted">{v.description}</p>}
          </Card>
        ))}
      </div>
    </Modal>
  );
}

/** Where the ad sends people: the home page, a product, or any address. */
function Destination({ ad, update, storeUrl, products, ctas }) {
  const base = String(storeUrl || "").replace(/\/$/, "");
  const urlOf = (p) => `${base}/products/${p.slug}`;
  const product = base ? (products || []).find((p) => urlOf(p) === ad.link) : null;
  const value = !ad.link ? undefined : base && (ad.link === base || ad.link === `${base}/`) ? "home" : product ? product.id : base && ad.link.startsWith(`${base}/products/`) ? "other-product" : "custom";
  const options = [
    ...(base ? [{ value: "home", label: "Home page" }] : []),
    ...(value === "other-product" ? [{ value: "other-product", label: "A product page" }] : []),
    ...(products?.length ? [{ label: "Products", options: products.map((p) => ({ value: p.id, label: p.title, thumb: thumbOf(p) })) }] : []),
    { value: "custom", label: "Another web address" },
  ];
  return (
    <Section title="Destination" description="Where people go when they tap the ad. The product they saw usually sells better than the home page.">
      <div className="grid gap-3 sm:grid-cols-2">
        <Form.Item label="Send people to" className="!mb-0">
          <Select
            showSearch
            optionFilterProp="label"
            loading={products === null}
            placeholder={base ? "Choose a page" : "Another web address"}
            value={value}
            onChange={(v) => {
              if (v === "home") update({ link: base });
              else if (v === "custom" || v === "other-product") update({ link: v === "custom" && value !== "custom" ? "" : ad.link });
              else {
                const p = (products || []).find((x) => x.id === v);
                if (p) update({ link: urlOf(p) });
              }
            }}
            options={options}
            optionRender={(o) =>
              o.data.thumb !== undefined ? (
                <span className="flex items-center gap-2">
                  {o.data.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.data.thumb} alt="" className="h-7 w-7 shrink-0 rounded object-cover" />
                  ) : (
                    <span className="h-7 w-7 shrink-0 rounded bg-app-bg" />
                  )}
                  <span className="truncate">{o.data.label}</span>
                </span>
              ) : (
                o.data.label
              )
            }
          />
        </Form.Item>
        <Form.Item label="Call to action" className="!mb-0">
          <Select value={ad.cta} onChange={(cta) => update({ cta })} options={ctas.filter((c) => c !== "WHATSAPP_MESSAGE").map((c) => ({ value: c, label: ctaLabel(c) }))} />
        </Form.Item>
      </div>
      <Form.Item label="Website URL" className="!mb-0">
        <Input value={ad.link} onChange={(e) => update({ link: e.target.value.trim() })} placeholder="https://" inputMode="url" />
      </Form.Item>
      {!base && <Note>The store&apos;s web address isn&apos;t set, so type the full address.</Note>}
    </Section>
  );
}

/** One ad: identity, format and media, text, destination. */
export function AdForm({ ad, update, caps, goal, advanced, storeUrl }) {
  const api = useAdsCoach();
  const [picker, setPicker] = useState(null); // { kind, target: "main" | "thumb" | card index }
  const [suggest, setSuggest] = useState(false);
  const products = useProducts();
  const whatsapp = caps.goals[goal]?.destination === "WHATSAPP";
  const text = ad.primaryText || "";
  return (
    <>
      <Section title="Ad name">
        <Input value={ad.name} onChange={(e) => update({ name: e.target.value })} maxLength={400} aria-label="Ad name" />
      </Section>

      <Section title="Identity" description="The Facebook Page and Instagram account the ad runs from.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Form.Item label="Facebook Page" className="!mb-0">
            <Select
              value={ad.identity.pageId}
              placeholder={caps.pages.length ? "Choose a Page" : "No Page available"}
              onChange={(pageId) => update({ identity: { pageId, instagramId: caps.pages.find((p) => p.id === pageId)?.instagram?.id || ad.identity.instagramId || null } })}
              options={caps.pages.map((p) => ({ value: p.id, label: p.name }))}
              notFoundContent={api.mode === "managed" ? "No Page shared yet. Ask the seller to share their Page with Oyklane." : "No Page found. Reconnect Facebook and allow your Pages."}
            />
          </Form.Item>
          <Form.Item label="Instagram account" className="!mb-0">
            <Select
              allowClear
              placeholder="Use the Facebook Page"
              value={ad.identity.instagramId}
              onChange={(instagramId) => update({ identity: { ...ad.identity, instagramId: instagramId || null } })}
              options={(caps.instagramAccounts || []).map((i) => ({ value: i.id, label: `@${i.username || i.id}` }))}
              notFoundContent="No Instagram account is linked to the Page or the ad account."
            />
          </Form.Item>
        </div>
        {!caps.pages.length && <Note tone="warn">{api.mode === "managed" ? "No Facebook Page is shared with Oyklane for this client. Ask the seller to share it (Business settings ▸ Partners ▸ Oyklane ▸ Pages), then set it in Details." : "No Facebook Page found. Ads run from a Page: create one, or reconnect Facebook and allow your Pages."}</Note>}
      </Section>

      <Section title="Ad setup">
        <Segmented value={ad.format} onChange={(format) => update({ format, cards: format === "carousel" && !ad.cards.length ? [{ key: rid() }, { key: rid() }] : ad.cards })} options={[{ value: "image", label: "Single image" }, { value: "video", label: "Video" }, { value: "carousel", label: "Carousel" }]} />
        {ad.format === "image" && (
          <div className="flex items-center gap-3">
            {ad.imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.imagePreview} alt="" className="h-20 w-20 rounded border border-app-border object-cover" />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded border border-dashed border-app-border text-ink-subtle">
                <ImageIcon size={20} aria-hidden="true" />
              </span>
            )}
            <div className="flex flex-col gap-1">
              <Button onClick={() => setPicker({ kind: "image", target: "main" })}>{ad.imageHash ? "Change image" : "Add image"}</Button>
              <Note>1:1 or 4:5, at least 1080 px.</Note>
            </div>
          </div>
        )}
        {ad.format === "video" && (
          <div className="flex flex-wrap items-center gap-3">
            {ad.videoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.videoPreview} alt="" className="h-20 w-20 rounded border border-app-border object-cover" />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded border border-dashed border-app-border text-ink-subtle">
                <Film size={20} aria-hidden="true" />
              </span>
            )}
            <Button onClick={() => setPicker({ kind: "video", target: "main" })}>{ad.videoId ? "Change video" : "Add video"}</Button>
            <Button onClick={() => setPicker({ kind: "image", target: "thumb" })}>{ad.thumbnailHash ? "Change cover image" : "Add cover image"}</Button>
            {ad.thumbnailPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.thumbnailPreview} alt="" className="h-12 w-12 rounded border border-app-border object-cover" />
            )}
          </div>
        )}
        {ad.format === "carousel" && (
          <div className="flex flex-col gap-2">
            {ad.cards.map((card, k) => (
              <div key={card.key} className="grid grid-cols-[56px_1fr_auto] items-center gap-2 sm:grid-cols-[56px_1fr_1fr_auto]">
                <button type="button" onClick={() => setPicker({ kind: "image", target: k })} className="grid h-14 w-14 place-items-center overflow-hidden rounded border border-dashed border-app-border" aria-label={`Card ${k + 1} image`}>
                  {card.imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.imagePreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon size={16} className="text-ink-subtle" aria-hidden="true" />
                  )}
                </button>
                <Input placeholder={`Card ${k + 1} headline`} value={card.headline} maxLength={40} onChange={(e) => update({ cards: ad.cards.map((c, j) => (j === k ? { ...c, headline: e.target.value } : c)) })} />
                {!whatsapp && <Input className="hidden sm:block" placeholder="Link (empty: the ad's link)" value={card.link} onChange={(e) => update({ cards: ad.cards.map((c, j) => (j === k ? { ...c, link: e.target.value } : c)) })} />}
                <Button size="small" type="text" danger disabled={ad.cards.length <= 2} icon={<Trash2 size={13} aria-hidden="true" />} onClick={() => update({ cards: ad.cards.filter((_, j) => j !== k) })} aria-label={`Remove card ${k + 1}`} />
              </div>
            ))}
            <Button size="small" className="self-start" icon={<Plus size={13} aria-hidden="true" />} disabled={ad.cards.length >= 10} onClick={() => update({ cards: [...ad.cards, { key: rid() }] })}>
              Add card
            </Button>
          </div>
        )}
      </Section>

      <Section
        title="Ad creative"
        extra={
          <Button size="small" icon={<PenLine size={13} aria-hidden="true" />} onClick={() => setSuggest(true)}>
            Suggest text
          </Button>
        }
      >
        <Form.Item label={<Label tip='The first 125 characters show before "See more" in most placements.'>Primary text</Label>} className="!mb-0" extra={`${text.length} characters${text.length > 125 ? ' — cut off with "See more"' : ""}`}>
          <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} value={ad.primaryText} maxLength={2200} onChange={(e) => update({ primaryText: e.target.value })} placeholder="Tell people what's special about the product, in a line or two." />
        </Form.Item>
        <div className="grid gap-3 sm:grid-cols-2">
          <Form.Item label="Headline" className="!mb-0" extra={`${(ad.headline || "").length}/40`}>
            <Input value={ad.headline} maxLength={255} onChange={(e) => update({ headline: e.target.value })} placeholder="e.g. Fresh, handmade, delivered" />
          </Form.Item>
          {advanced && (
            <Form.Item label="Description (optional)" className="!mb-0">
              <Input value={ad.description} maxLength={255} onChange={(e) => update({ description: e.target.value })} />
            </Form.Item>
          )}
        </div>
      </Section>

      {whatsapp ? (
        <Section title="Destination">
          <Alert type="info" showIcon message='The button is "Send message": tapping the ad opens a WhatsApp chat with the business.' />
        </Section>
      ) : (
        <Destination ad={ad} update={update} storeUrl={storeUrl} products={products} ctas={caps.ctas} />
      )}

      <MediaPicker
        open={Boolean(picker)}
        kind={picker?.kind}
        onClose={() => setPicker(null)}
        onPick={(m) => {
          if (picker.target === "main" && picker.kind === "image") update({ imageHash: m.hash, imagePreview: m.previewUrl });
          else if (picker.target === "main") update({ videoId: m.videoId, videoPreview: m.previewUrl });
          else if (picker.target === "thumb") update({ thumbnailHash: m.hash, thumbnailPreview: m.previewUrl });
          else update({ cards: ad.cards.map((c, j) => (j === picker.target ? { ...c, imageHash: m.hash, imagePreview: m.previewUrl } : c)) });
          setPicker(null);
        }}
      />
      <SuggestText
        open={suggest}
        goal={goal}
        products={products}
        onClose={() => setSuggest(false)}
        onUse={(v) => {
          update({ primaryText: v.primaryText, headline: v.headline, description: v.description || ad.description });
          setSuggest(false);
        }}
      />
    </>
  );
}
