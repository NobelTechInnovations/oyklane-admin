"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Drawer, Empty, Form, Input, InputNumber, Modal, Segmented, Select, Skeleton, Slider, Switch, Tag } from "antd";
import { ImagePlus, Users, Wallet, CalendarClock, Type, Link2, MousePointerClick } from "lucide-react";
import { apiFetch } from "@/lib/api";

const CTA_LABEL = {
  SHOP_NOW: "Shop now",
  ORDER_NOW: "Order now",
  BUY_NOW: "Buy now",
  LEARN_MORE: "Learn more",
  GET_OFFER: "Get offer",
  SIGN_UP: "Sign up",
  CONTACT_US: "Contact us",
  SUBSCRIBE: "Subscribe",
  SEE_MORE: "See more",
  BOOK_NOW: "Book now",
  WHATSAPP_MESSAGE: "Send WhatsApp message",
};

// <input type="datetime-local"> speaks local time without a zone.
const toLocal = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function Section({ icon: Icon, title, children, note }) {
  return (
    <section className="rounded-xl border border-app-border bg-app-surface p-4">
      <h3 className="m-0 mb-3 flex items-center gap-2 text-[14px] font-semibold text-ink">
        <Icon size={15} className="text-ink-muted" aria-hidden="true" />
        {title}
      </h3>
      {children}
      {note && <p className="m-0 mt-2 text-[12.5px] text-ink-muted">{note}</p>}
    </section>
  );
}

/** Ad set: name, budget, dates, age and gender (places and interests stay as set). */
export function AdSetEditor({ id, onClose, onSaved }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!id) return;
    setD(null);
    apiFetch(`/api/meta-ads/adsets/${id}/detail`)
      .then((r) => {
        setD(r);
        form.setFieldsValue({ name: r.name, on: r.status === "ACTIVE", budget: r.budget?.amount, start: toLocal(r.start), end: toLocal(r.end), ages: [r.ageMin, r.ageMax], gender: r.gender });
      })
      .catch((err) => {
        message.error(err.message);
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, form, message]);
  const started = d?.start && new Date(d.start) < new Date();

  async function save() {
    const v = await form.validateFields();
    const body = {};
    if (v.name !== d.name) body.name = v.name;
    if ((v.on ? "ACTIVE" : "PAUSED") !== d.status) body.status = v.on ? "ACTIVE" : "PAUSED";
    if (d.budget && v.budget !== d.budget.amount) body.budget = v.budget;
    if (v.end !== toLocal(d.end)) body.endTime = v.end ? new Date(v.end).toISOString() : null;
    if (!started && v.start && v.start !== toLocal(d.start)) body.startTime = new Date(v.start).toISOString();
    if (v.ages[0] !== d.ageMin) body.ageMin = v.ages[0];
    if (v.ages[1] !== d.ageMax) body.ageMax = v.ages[1];
    if (v.gender !== d.gender) body.gender = v.gender;
    if (!Object.keys(body).length) return onClose();
    setBusy(true);
    try {
      await apiFetch(`/api/meta-ads/adsets/${id}/detail`, { method: "PUT", body });
      message.success("Saved at Meta");
      onSaved?.();
      onClose();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={Boolean(id)}
      onClose={onClose}
      width={560}
      title="Edit ad set"
      destroyOnHidden
      extra={
        <Button type="primary" loading={busy} disabled={!d} onClick={save}>
          Save
        </Button>
      }
    >
      {!d ? (
        <Skeleton active />
      ) : (
        <Form form={form} layout="vertical" requiredMark={false} className="flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <Form.Item name="name" label="Ad set name" className="!mb-0 flex-1" rules={[{ required: true, message: "Give it a name" }]}>
              <Input maxLength={400} />
            </Form.Item>
            <Form.Item name="on" label="On" valuePropName="checked" className="!mb-0">
              <Switch />
            </Form.Item>
          </div>
          <Section icon={Wallet} title="Budget" note={d.budget ? "Big jumps restart Meta's learning. Change by 20–30% at a time when you can." : null}>
            {d.budget ? (
              <Form.Item name="budget" label={d.budget.type === "daily" ? "Daily budget (₹)" : "Total budget (₹)"} className="!mb-0" rules={[{ required: true }]}>
                <InputNumber min={1} className="w-full" />
              </Form.Item>
            ) : (
              <p className="m-0 text-[13px] text-ink-muted">This campaign shares one budget across its ad sets — change it on the campaign.</p>
            )}
          </Section>
          <Section icon={CalendarClock} title="Schedule">
            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="start" label="Starts" className="!mb-0" extra={started ? "Already running." : null}>
                <Input type="datetime-local" disabled={started} />
              </Form.Item>
              <Form.Item name="end" label="Ends (optional)" className="!mb-0">
                <Input type="datetime-local" />
              </Form.Item>
            </div>
          </Section>
          <Section icon={Users} title="Audience" note={`Places: ${d.places}${d.advantageAudience ? " · Advantage+ audience (Meta may go wider when it helps)" : ""}. To change places or interests, duplicate the ad set and set them in a new one.`}>
            <Form.Item name="ages" label="Age" className="!mb-3">
              <Slider range min={18} max={65} marks={{ 18: "18", 25: "25", 35: "35", 45: "45", 55: "55", 65: "65+" }} />
            </Form.Item>
            <Form.Item name="gender" label="Gender" className="!mb-0">
              <Segmented options={[{ value: "all", label: "Everyone" }, { value: "women", label: "Women" }, { value: "men", label: "Men" }]} />
            </Form.Item>
          </Section>
        </Form>
      )}
    </Drawer>
  );
}

/** Picks a photo or video from the ad media library. */
function MediaPicker({ open, kind, onClose, onPick }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    if (!open) return;
    apiFetch("/api/meta-ads/media")
      .then((r) => setItems(r.media || []))
      .catch(() => setItems([]));
  }, [open]);
  const list = (items || []).filter((m) => (kind === "any" ? true : m.kind === kind) && m.status !== "failed");
  return (
    <Modal open={open} onCancel={onClose} footer={null} width={720} title={kind === "image" ? "Choose a photo" : kind === "video" ? "Choose a video" : "Choose a photo or video"}>
      {!items ? (
        <Skeleton active />
      ) : list.length === 0 ? (
        <Empty description="Nothing in your ad media yet — add some in Meta Ads ▸ Media library." />
      ) : (
        <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
          {list.map((m) => (
            <button key={m.id} type="button" onClick={() => onPick(m)} className="group cursor-pointer overflow-hidden rounded-lg border border-app-border bg-app-bg p-0 text-left hover:border-ink">
              <span className="block aspect-square bg-app-bg">
                {m.previewUrl ? <img src={m.previewUrl} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-[12px] text-ink-muted">{m.kind === "video" ? "Video" : "Photo"}</span>}
              </span>
              <span className="block truncate px-2 py-1 text-[11.5px] text-ink-muted">
                {m.kind === "video" ? "🎥 " : ""}
                {m.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

/** A feed-style preview of the ad as it's typed. */
function AdPreview({ page, text, headline, description, cta, image, link }) {
  let host = "";
  try {
    host = link ? new URL(link).hostname.replace(/^www\./, "") : "";
  } catch {}
  return (
    <div className="overflow-hidden rounded-xl border border-app-border bg-white text-[13px] text-[#1c1e21] shadow-card">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="h-8 w-8 rounded-full bg-app-bg" />
        <span>
          <b className="block text-[13px]">{page || "Your Page"}</b>
          <span className="text-[11.5px] text-[#65676b]">Sponsored</span>
        </span>
      </div>
      <p className="m-0 whitespace-pre-wrap px-3 pb-2 leading-snug">{text || "Your main text appears here."}</p>
      <div className="aspect-square bg-[#f0f2f5]">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-[#8a8d91]">Photo or video</span>}</div>
      <div className="flex items-center justify-between gap-3 bg-[#f0f2f5] px-3 py-2.5">
        <span className="min-w-0">
          <span className="block truncate text-[11.5px] uppercase text-[#65676b]">{host || "yourstore.com"}</span>
          <b className="block truncate">{headline || "Headline"}</b>
          {description && <span className="block truncate text-[12px] text-[#65676b]">{description}</span>}
        </span>
        <span className="shrink-0 rounded-md bg-[#e4e6eb] px-3 py-1.5 text-[12.5px] font-semibold">{CTA_LABEL[cta] || "Shop now"}</span>
      </div>
    </div>
  );
}

/**
 * Ad: edit its name, text and media — or, with `adSetId`, create a new ad
 * in that ad set (also one that has no ads yet).
 */
export function AdEditor({ id, adSetId, onClose, onSaved }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [d, setD] = useState(null);
  const [caps, setCaps] = useState(null);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(null);
  const [media, setMedia] = useState(null);
  const [thumb, setThumb] = useState(null);
  const creating = Boolean(adSetId);
  const open = Boolean(id || adSetId);
  const v = Form.useWatch([], form) || {};

  useEffect(() => {
    if (!open) return;
    setD(null);
    setMedia(null);
    setThumb(null);
    apiFetch("/api/meta-ads/capabilities")
      .then(setCaps)
      .catch(() => setCaps({ pages: [] }));
    if (creating) {
      setD({ format: "image", status: "PAUSED", whatsapp: false });
      form.setFieldsValue({ name: "New ad", on: false, primaryText: "", headline: "", description: "", cta: "SHOP_NOW", link: "", pageId: undefined });
      return;
    }
    apiFetch(`/api/meta-ads/ads/${id}/detail`)
      .then((r) => {
        setD(r);
        form.setFieldsValue({ name: r.name, on: r.status === "ACTIVE", primaryText: r.primaryText, headline: r.headline, description: r.description, cta: r.cta, link: r.link, pageId: r.identity?.pageId });
      })
      .catch((err) => {
        message.error(err.message);
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, id, adSetId, creating, form, message]);

  useEffect(() => {
    if (creating && caps?.pages?.length && !form.getFieldValue("pageId")) form.setFieldValue("pageId", caps.defaults?.pageId || caps.pages[0].id);
  }, [caps, creating, form]);

  const page = useMemo(() => (caps?.pages || []).find((p) => p.id === v.pageId), [caps, v.pageId]);
  const carousel = d?.format === "carousel";

  async function save() {
    const f = await form.validateFields();
    const body = { name: f.name, status: f.on ? "ACTIVE" : "PAUSED" };
    for (const k of ["primaryText", "headline", "description", "cta", "link", "pageId"]) if (creating || f[k] !== (k === "pageId" ? d.identity?.pageId : d[k])) body[k] = f[k];
    if (page?.instagram?.id) body.instagramId = page.instagram.id;
    if (media) body.mediaId = media.id;
    if (thumb) body.thumbnailMediaId = thumb.id;
    if (creating && !media) return message.error("Choose a photo or video for the ad.");
    setBusy(true);
    try {
      if (creating) await apiFetch(`/api/meta-ads/adsets/${adSetId}/ads`, { method: "POST", body });
      else await apiFetch(`/api/meta-ads/ads/${id}/detail`, { method: "PUT", body });
      message.success(creating ? "Ad created at Meta" : "Saved at Meta — the ad goes back to Meta's review if its text or media changed");
      onSaved?.();
      onClose();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const previewImage = media?.previewUrl || (media ? null : d?.imageUrl || d?.thumbnailUrl || d?.preview);
  const isVideo = media ? media.kind === "video" : d?.format === "video";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={980}
      title={creating ? "New ad" : "Edit ad"}
      destroyOnHidden
      extra={
        <Button type="primary" loading={busy} disabled={!d} onClick={save}>
          {creating ? "Create ad" : "Save"}
        </Button>
      }
    >
      {!d ? (
        <Skeleton active />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Form form={form} layout="vertical" requiredMark={false} className="flex flex-col gap-4">
            {carousel && <Alert type="info" showIcon message="Carousel ads: only the name and on/off can change here. To change the cards, duplicate the ad set and build a new carousel." />}
            <div className="flex items-end gap-3">
              <Form.Item name="name" label="Ad name" className="!mb-0 flex-1" rules={[{ required: true, message: "Give it a name" }]}>
                <Input maxLength={400} />
              </Form.Item>
              <Form.Item name="on" label="On" valuePropName="checked" className="!mb-0">
                <Switch />
              </Form.Item>
            </div>
            {!carousel && (
              <>
                <Section icon={ImagePlus} title={isVideo ? "Video" : "Photo or video"}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="h-16 w-16 overflow-hidden rounded-lg border border-app-border bg-app-bg">{previewImage ? <img src={previewImage} alt="" className="h-full w-full object-cover" /> : null}</span>
                    <Button onClick={() => setPicker(creating ? "any" : isVideo ? "video" : "image")}>{media || !creating ? "Change" : "Choose from media"}</Button>
                    {media && <Tag>{media.name}</Tag>}
                    {isVideo && (
                      <Button onClick={() => setPicker("thumb")}>{thumb ? "Change cover" : "Cover image"}</Button>
                    )}
                  </div>
                </Section>
                <Section icon={Type} title="Text">
                  <Form.Item name="primaryText" label="Main text" rules={[{ required: true, message: "Write the main text" }]}>
                    <Input.TextArea rows={4} maxLength={2000} showCount placeholder="What's the offer, and why now?" />
                  </Form.Item>
                  <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
                    <Form.Item name="headline" label="Headline">
                      <Input maxLength={255} placeholder="e.g. 20% off this weekend" />
                    </Form.Item>
                    <Form.Item name="description" label="Description (optional)">
                      <Input maxLength={255} />
                    </Form.Item>
                  </div>
                </Section>
                <Section icon={MousePointerClick} title="Button and link">
                  <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
                    <Form.Item name="cta" label="Button">
                      <Select options={Object.entries(CTA_LABEL).filter(([k]) => (d.whatsapp ? k === "WHATSAPP_MESSAGE" : k !== "WHATSAPP_MESSAGE")).map(([value, label]) => ({ value, label }))} />
                    </Form.Item>
                    {!d.whatsapp && (
                      <Form.Item name="link" label="Website link" rules={[{ required: true, message: "Add the link" }, { pattern: /^https?:\/\//i, message: "Start with https://" }]}>
                        <Input prefix={<Link2 size={14} className="text-ink-muted" />} placeholder="https://yourstore.com/products/…" />
                      </Form.Item>
                    )}
                  </div>
                  <Form.Item name="pageId" label="Runs from Facebook Page" className="!mb-0">
                    <Select placeholder="Choose a Page" options={(caps?.pages || []).map((p) => ({ value: p.id, label: `${p.name}${p.instagram ? ` · Instagram @${p.instagram.username}` : ""}` }))} />
                  </Form.Item>
                </Section>
              </>
            )}
          </Form>
          <div className="lg:sticky lg:top-0 lg:self-start">
            <p className="m-0 mb-2 text-[12.5px] font-medium text-ink-muted">Preview</p>
            <AdPreview page={page?.name} text={v.primaryText} headline={v.headline} description={v.description} cta={v.cta} image={thumb?.previewUrl || previewImage} link={v.link} />
            <p className="m-0 mt-2 text-[12px] text-ink-muted">A sketch — Meta shows the exact look per placement.</p>
          </div>
        </div>
      )}
      <MediaPicker
        open={Boolean(picker)}
        kind={picker === "thumb" ? "image" : picker || "any"}
        onClose={() => setPicker(null)}
        onPick={(m) => {
          if (picker === "thumb") setThumb(m);
          else setMedia(m);
          setPicker(null);
        }}
      />
    </Drawer>
  );
}
