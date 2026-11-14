"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { App, Alert, Button, Card, ColorPicker, Empty, Form, Input, Modal, Progress, Radio, Select, Skeleton, Slider, Switch, Tabs, Tag, Tooltip } from "antd";
import { ArrowDown, ArrowUp, Eye, EyeOff, Film, MousePointerClick, Pencil, Plus, ShoppingCart, Trash2, Upload, Paintbrush } from "lucide-react";
import { PageHeader, useConfirmDialog } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { sendWithFallback } from "@/lib/uploads";
import { AppNotInstalled } from "@/components/apps/AppPanelParts";
import { ImageUploadField } from "@/components/ImageUploadField";

const inr = (n) => (n == null ? "" : `₹${Number(n).toLocaleString("en-IN")}`);
const mb = (b) => `${Math.round(b / 1024 / 1024)} MB`;

/** Products with their first image, for tagging — loaded once. */
function useProducts() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    apiFetch("/api/products?pageSize=100")
      .then((d) => setProducts(d.products || []))
      .catch(() => {});
  }, []);
  return products;
}

function ProductSelect({ products, value, onChange }) {
  return (
    <Select
      mode="multiple"
      value={value}
      onChange={onChange}
      maxCount={10}
      placeholder="Search products in this video"
      optionFilterProp="label"
      options={products.map((p) => ({ value: p.id, label: p.title, image: p.images?.[0]?.url || null }))}
      optionRender={(o) => (
        <span className="flex items-center gap-2.5">
          <span className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-app-border bg-app-bg">{o.data.image && <img src={o.data.image} alt="" className="h-full w-full object-cover" loading="lazy" />}</span>
          <span className="truncate">{o.data.label}</span>
        </span>
      )}
    />
  );
}

/** Sends the file straight to the media storage with a signature from the
 * API (and to the backup storage if the main one refuses it). */
async function uploadVideo(file, onProgress, maxBytes) {
  if (maxBytes && file.size > maxBytes) throw new Error(`Videos can be up to ${mb(maxBytes)}.`);
  return sendWithFallback("/api/shoppable-videos/upload/sign", file, "video.mp4", onProgress);
}

function VideoModal({ open, video, products, upload, onClose, onSaved }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [mode, setMode] = useState("upload");
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [saving, setSaving] = useState(false);
  const input = useRef(null);
  const editing = Boolean(video);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(video ? { title: video.title, caption: video.caption, posterUrl: video.storage ? "" : video.posterUrl, productIds: video.productIds, visible: video.visible } : { visible: true, productIds: [] });
    setFile(null);
    setProgress(null);
    setMode(upload.storage ? "upload" : "link");
  }, [open, video, form, upload.storage]);

  async function save(values) {
    setSaving(true);
    try {
      const body = { title: values.title, caption: values.caption || "", productIds: values.productIds || [], visible: values.visible, posterUrl: values.posterUrl || null };
      if (editing) {
        await apiFetch(`/api/shoppable-videos/${video.id}`, { method: "PATCH", body });
      } else {
        if (mode === "upload") {
          if (!file) throw new Error("Choose a video file.");
          setProgress(0);
          const sent = await uploadVideo(file, setProgress, upload.maxBytes);
          body.providerFileId = sent.providerFileId;
          body.storage = sent.storage;
        } else body.videoUrl = values.videoUrl;
        await apiFetch("/api/shoppable-videos", { method: "POST", body });
      }
      message.success(editing ? "Video saved" : "Video added");
      onSaved();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  return (
    <Modal open={open} onCancel={onClose} title={editing ? "Edit video" : "Add a video"} okText={editing ? "Save" : "Add video"} confirmLoading={saving} onOk={() => form.submit()} width={620} destroyOnHidden>
      <Form form={form} layout="vertical" requiredMark={false} onFinish={save}>
        {!editing && (
          <>
            {upload.storage && (
              <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} className="mb-3" optionType="button" options={[{ value: "upload", label: "Upload" }, { value: "link", label: "Paste a link" }]} />
            )}
            {mode === "upload" ? (
              <div className="mb-4">
                <input ref={input} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  className="w-full rounded-[12px] border-[1.5px] border-dashed border-app-border bg-app-bg px-4 py-6 text-center cursor-pointer hover:border-[#9AA3B2] transition-colors"
                >
                  <Upload size={20} className="mx-auto mb-1.5 text-ink-muted" aria-hidden="true" />
                  <span className="block text-[14px] text-ink">{file ? file.name : "Choose a video"}</span>
                  <span className="block text-[12.5px] text-ink-muted">{file ? mb(file.size) : `MP4, WebM or MOV, up to ${mb(upload.maxBytes)} — upright (9:16) looks best`}</span>
                </button>
                {progress != null && <Progress percent={progress} size="small" className="mt-2" />}
              </div>
            ) : (
              <Form.Item name="videoUrl" label="Video link" rules={[{ required: true, pattern: /^https:\/\//, message: "A full https:// link to an MP4 or WebM file" }]} extra="A direct link to the video file, not a YouTube page.">
                <Input placeholder="https://…/video.mp4" />
              </Form.Item>
            )}
          </>
        )}
        <Form.Item name="title" label="Title" rules={[{ required: true, message: "Name the video" }]}>
          <Input maxLength={120} placeholder="How we grind our turmeric" />
        </Form.Item>
        <Form.Item name="caption" label="Caption (optional)">
          <Input.TextArea rows={2} maxLength={600} showCount />
        </Form.Item>
        <Form.Item name="productIds" label="Products in this video" extra="Shoppers add these to the cart from the video. Up to 10.">
          <ProductSelect products={products} />
        </Form.Item>
        <Form.Item name="posterUrl" label={editing && video.storage ? "Cover image (optional — the first frame is used otherwise)" : "Cover image (optional)"}>
          <ImageUploadField hint="Shown before the video plays. Upright 9:16 images fit best." />
        </Form.Item>
        <Form.Item name="visible" label="Show on the store" valuePropName="checked" className="mb-0">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function Videos({ data, products, reload }) {
  const { message } = App.useApp();
  const { confirmDialog } = useConfirmDialog();
  const [modal, setModal] = useState({ open: false, video: null });
  const full = data.used >= data.limit;

  async function patch(v, body) {
    try {
      await apiFetch(`/api/shoppable-videos/${v.id}`, { method: "PATCH", body });
      reload();
    } catch (err) {
      message.error(err.message);
    }
  }
  async function move(i, d) {
    const ids = data.videos.map((v) => v.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    try {
      await apiFetch("/api/shoppable-videos/order", { method: "PUT", body: { ids } });
      reload();
    } catch (err) {
      message.error(err.message);
    }
  }
  async function remove(v) {
    const ok = await confirmDialog({ title: `Delete "${v.title}"?`, content: "It's removed from your store and its file is deleted.", okText: "Delete", danger: true });
    if (!ok) return;
    try {
      await apiFetch(`/api/shoppable-videos/${v.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      message.error(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-app-border bg-white px-4 py-3">
        <div className="min-w-[220px] flex-1">
          <p className="m-0 text-[13px] text-ink">
            <b className="tabular-nums">{data.used}</b> of {data.limit} videos <span className="text-ink-muted">· {data.plan} plan</span>
          </p>
          <Progress percent={Math.round((data.used / data.limit) * 100)} showInfo={false} size="small" strokeColor={full ? "#B45309" : undefined} className="m-0 max-w-[320px]" />
        </div>
        {full && data.key !== "pro" ? (
          <Link href="/admin/settings/billing">
            <Button>Upgrade for {data.key === "starter" ? "10" : "20"} videos</Button>
          </Link>
        ) : null}
        <Button type="primary" icon={<Plus size={14} aria-hidden="true" />} disabled={full} onClick={() => setModal({ open: true, video: null })}>
          Add video
        </Button>
      </div>

      {!data.videos.length ? (
        <Card>
          <Empty image={<Film size={40} className="mx-auto text-ink-subtle" aria-hidden="true" />} description="No videos yet. Add a short clip of a product in use, a how-to or an unboxing.">
            <Button type="primary" icon={<Plus size={14} aria-hidden="true" />} onClick={() => setModal({ open: true, video: null })}>
              Add your first video
            </Button>
          </Empty>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.videos.map((v, i) => (
            <div key={v.id} className={`flex gap-3 rounded-[12px] border border-app-border bg-white p-3 ${v.visible ? "" : "opacity-70"}`}>
              <div className="relative h-[142px] w-[80px] shrink-0 overflow-hidden rounded-[10px] bg-[#111]">
                {v.posterUrl ? <img src={v.posterUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <video src={v.videoUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />}
                {!v.visible && <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[11px] text-white">Hidden</span>}
              </div>
              <div className="min-w-0 flex-1 flex flex-col">
                <p className="m-0 text-[14px] font-medium text-ink truncate" title={v.title}>{v.title}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {v.productIds.length ? (
                    v.productIds.slice(0, 3).map((pid) => (
                      <Tag key={pid} className="m-0 max-w-[150px] truncate">
                        {data.products[pid]?.title || "Removed product"}
                      </Tag>
                    ))
                  ) : (
                    <span className="text-[12px] text-[#B45309]">No products tagged</span>
                  )}
                  {v.productIds.length > 3 && <Tag className="m-0" bordered={false}>+{v.productIds.length - 3}</Tag>}
                </div>
                <div className="mt-auto pt-2 flex items-center gap-3 text-[12px] text-ink-muted tabular-nums">
                  <Tooltip title="Views"><span className="inline-flex items-center gap-1"><Eye size={12} aria-hidden="true" />{v.views}</span></Tooltip>
                  <Tooltip title="Product taps"><span className="inline-flex items-center gap-1"><MousePointerClick size={12} aria-hidden="true" />{v.productClicks}</span></Tooltip>
                  <Tooltip title="Added to cart"><span className="inline-flex items-center gap-1"><ShoppingCart size={12} aria-hidden="true" />{v.addToCarts}</span></Tooltip>
                </div>
                <div className="mt-2 flex items-center gap-0.5">
                  <Button size="small" type="text" icon={<Pencil size={13} aria-hidden="true" />} aria-label="Edit" onClick={() => setModal({ open: true, video: v })} />
                  <Button size="small" type="text" icon={v.visible ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />} aria-label={v.visible ? "Hide" : "Show"} onClick={() => patch(v, { visible: !v.visible })} />
                  <Button size="small" type="text" icon={<ArrowUp size={13} aria-hidden="true" />} aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} />
                  <Button size="small" type="text" icon={<ArrowDown size={13} aria-hidden="true" />} aria-label="Move down" disabled={i === data.videos.length - 1} onClick={() => move(i, 1)} />
                  <Button size="small" type="text" danger icon={<Trash2 size={13} aria-hidden="true" />} aria-label="Delete" className="ml-auto" onClick={() => remove(v)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card size="small" title="Put the videos on your store">
        <p className="m-0 text-[13px] text-ink-muted">
          Online Store ▸ Customize ▸ <b>Add section</b> ▸ Apps ▸ <b>Shoppable videos</b> — on the home page, a collection or a product page (where it can show only that product&apos;s videos).
        </p>
        <Link href="/admin/online-store/themes">
          <Button size="small" className="mt-2" icon={<Paintbrush size={13} aria-hidden="true" />}>Open Customize</Button>
        </Link>
      </Card>

      <VideoModal
        open={modal.open}
        video={modal.video}
        products={products}
        upload={data.upload}
        onClose={() => setModal({ open: false, video: null })}
        onSaved={() => {
          setModal({ open: false, video: null });
          reload();
        }}
      />
    </div>
  );
}

/** A small live preview of how the cards look with these settings. */
function Preview({ s, sample }) {
  const ratio = s.aspect === "4:5" ? "4/5" : s.aspect === "1:1" ? "1/1" : "9/16";
  const items = sample.length ? sample : [{ id: "a", title: "Your video", posterUrl: null }, { id: "b", title: "Another video", posterUrl: null }, { id: "c", title: "And one more", posterUrl: null }];
  return (
    <div className="rounded-[12px] border border-app-border bg-white p-4 overflow-hidden">
      {s.heading && <p className="m-0 text-[17px] font-semibold text-ink">{s.heading}</p>}
      {s.subheading && <p className="m-0 mt-0.5 text-[12.5px] text-ink-muted">{s.subheading}</p>}
      <div className={`mt-3 flex gap-2.5 ${s.layout === "grid" ? "flex-wrap" : "overflow-hidden"}`}>
        {items.slice(0, s.layout === "grid" ? s.columns : 4).map((v) =>
          s.layout === "stories" ? (
            <div key={v.id} className="w-[64px] shrink-0 text-center">
              <span className="block h-[60px] w-[60px] rounded-full p-[2px] mx-auto" style={{ background: s.accent || "#111" }}>
                <span className="block h-full w-full rounded-full border-2 border-white bg-[#333] bg-cover bg-center" style={v.posterUrl ? { backgroundImage: `url(${v.posterUrl})` } : undefined} />
              </span>
              {s.showTitle && <span className="mt-1 block truncate text-[10.5px] text-ink">{v.title}</span>}
            </div>
          ) : (
            <div
              key={v.id}
              className="relative shrink-0 overflow-hidden bg-[#2a2a2a] bg-cover bg-center"
              style={{ width: s.layout === "grid" ? `calc((100% - ${(s.columns - 1) * 10}px) / ${s.columns})` : Math.round(s.cardWidth * 0.55), aspectRatio: ratio, borderRadius: s.radius * 0.7, backgroundImage: v.posterUrl ? `url(${v.posterUrl})` : undefined }}
            >
              <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
              {s.showViews && <span className="absolute right-1.5 top-1.5 rounded-full bg-black/50 px-1.5 text-[9px] text-white">120 views</span>}
              <span className="absolute inset-x-1.5 bottom-1.5 flex flex-col gap-1">
                {s.showTitle && <span className="text-[10.5px] font-semibold leading-tight text-white line-clamp-2">{v.title}</span>}
                {s.showProduct && (
                  <span className="rounded-[6px] bg-white/95 px-1.5 py-1 text-[9.5px] leading-tight text-[#111]">
                    <b className="block truncate">Product name</b>
                    {s.showPrice && "₹499"}
                  </span>
                )}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function Settings({ settings, sample, onSaved }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const v = Form.useWatch([], form) || settings;
  useEffect(() => {
    form.setFieldsValue(settings);
  }, [settings, form]);

  async function save(values) {
    setSaving(true);
    try {
      const accent = typeof values.accent === "string" ? values.accent : values.accent?.toHexString?.() || "";
      const r = await apiFetch("/api/shoppable-videos/settings", { method: "PUT", body: { ...values, accent } });
      onSaved(r.settings);
      message.success("Settings saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }
  const live = { ...settings, ...v, accent: typeof v.accent === "string" ? v.accent : v.accent?.toHexString?.() || "" };

  return (
    <Form form={form} layout="vertical" requiredMark={false} onFinish={save} initialValues={settings}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        <div className="flex flex-col gap-4">
          <Card size="small" title="Layout">
            <Form.Item name="layout" className="mb-3">
              <Radio.Group
                optionType="button"
                options={[
                  { value: "carousel", label: "Scrolling row" },
                  { value: "grid", label: "Grid" },
                  { value: "stories", label: "Story circles" },
                ]}
              />
            </Form.Item>
            {live.layout !== "stories" && (
              <div className="grid sm:grid-cols-2 gap-x-6">
                <Form.Item name="aspect" label="Card shape">
                  <Select options={[{ value: "9:16", label: "Upright 9:16 (reels)" }, { value: "4:5", label: "Portrait 4:5" }, { value: "1:1", label: "Square 1:1" }]} />
                </Form.Item>
                <Form.Item name="radius" label={`Corner rounding · ${live.radius}px`}>
                  <Slider min={0} max={32} />
                </Form.Item>
                {live.layout === "carousel" ? (
                  <Form.Item name="cardWidth" label={`Card width · ${live.cardWidth}px`}>
                    <Slider min={140} max={340} step={10} />
                  </Form.Item>
                ) : (
                  <Form.Item name="columns" label={`Videos across (computer) · ${live.columns}`}>
                    <Slider min={2} max={6} />
                  </Form.Item>
                )}
              </div>
            )}
          </Card>
          <Card size="small" title="Heading">
            <div className="grid sm:grid-cols-2 gap-x-4">
              <Form.Item name="heading" label="Heading">
                <Input maxLength={80} />
              </Form.Item>
              <Form.Item name="subheading" label="Line under it (optional)">
                <Input maxLength={160} />
              </Form.Item>
            </div>
          </Card>
          <Card size="small" title="On each video">
            <div className="grid sm:grid-cols-2 gap-x-6">
              {[
                ["autoplay", "Play silently as shoppers scroll"],
                ["showTitle", "Show the title"],
                ["showProduct", "Show the first product"],
                ["showPrice", "Show its price"],
                ["showViews", "Show the view count"],
              ].map(([k, label]) => (
                <label key={k} className="flex items-center gap-2.5 text-[13.5px] text-ink mb-2.5">
                  <Form.Item name={k} valuePropName="checked" noStyle>
                    <Switch size="small" />
                  </Form.Item>
                  {label}
                </label>
              ))}
            </div>
          </Card>
          <Card size="small" title="Player">
            <div className="grid sm:grid-cols-2 gap-x-4">
              <Form.Item name="buttonLabel" label="Button text">
                <Input maxLength={30} />
              </Form.Item>
              <Form.Item name="accent" label="Button and ring colour (empty uses your theme's)">
                <ColorPicker allowClear format="hex" showText />
              </Form.Item>
            </div>
            <label className="flex items-center gap-2.5 text-[13.5px] text-ink">
              <Form.Item name="playerAutoplaySound" valuePropName="checked" noStyle>
                <Switch size="small" />
              </Form.Item>
              Sound on when a video opens (phones may still start it muted)
            </label>
          </Card>
          <Card size="small" title="Floating video">
            <label className="flex items-center gap-2.5 text-[13.5px] text-ink mb-3">
              <Form.Item name="floating" valuePropName="checked" noStyle>
                <Switch size="small" />
              </Form.Item>
              Show your first video as a small floating bubble on every page
            </label>
            {live.floating && (
              <Form.Item name="floatingPosition" label="Corner" className="mb-0">
                <Radio.Group optionType="button" options={[{ value: "left", label: "Bottom left" }, { value: "right", label: "Bottom right" }]} />
              </Form.Item>
            )}
          </Card>
        </div>
        <div className="flex flex-col gap-3 lg:sticky lg:top-4">
          <p className="m-0 text-[12.5px] font-medium text-ink-muted">Preview</p>
          <Preview s={live} sample={sample} />
          <Button type="primary" htmlType="submit" loading={saving} block>
            Save settings
          </Button>
        </div>
      </div>
    </Form>
  );
}

/** Apps ▸ Shoppable Videos. */
export default function ShoppableVideosPage() {
  const { message } = App.useApp();
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  const products = useProducts();

  const load = useCallback(async () => {
    try {
      setData(await apiFetch("/api/shoppable-videos"));
    } catch (err) {
      if (err.status === 402) setMissing(true);
      else message.error(err.message);
    }
  }, [message]);
  useEffect(() => {
    load();
  }, [load]);

  if (missing) return <AppNotInstalled appKey="shoppable-videos" title="Shoppable Videos" description="Reels on your store that shoppers buy from." />;
  if (!data) return <Skeleton active paragraph={{ rows: 8 }} />;
  return (
    <div>
      <PageHeader title="Shoppable Videos" backHref="/admin/apps" />
      {!data.ready && <Alert className="mb-4" type="info" showIcon message="Shoppable videos are being switched on — you can add videos shortly." />}
      <Tabs
        items={[
          { key: "videos", label: "Videos", children: <Videos data={data} products={products} reload={load} /> },
          { key: "settings", label: "Settings", children: <Settings settings={data.settings} sample={data.videos.slice(0, 6)} onSaved={(settings) => setData((d) => ({ ...d, settings }))} /> },
        ]}
      />
    </div>
  );
}
