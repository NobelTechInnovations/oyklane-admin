"use client";

import { useState } from "react";
import { Button, Modal, Segmented, Spin } from "antd";
import { Bookmark, ChevronUp, Globe, Heart, ImageIcon, MessageCircle, MoreHorizontal, Play, Send, Share2, ThumbsUp } from "lucide-react";
import { useAdsCoach } from "../context";
import { ctaLabel } from "./model";

const host = (link) => {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

function Avatar({ src, name, size = 32 }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="shrink-0 rounded-full border border-black/5 object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-[#E4E6EB] text-[12px] font-semibold text-[#65676B]" style={{ width: size, height: size }}>
      {(name || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

/** The ad's picture: image, video cover or carousel cards. */
function Media({ ad, ratio = "1 / 1", cta, dark }) {
  if (ad.format === "carousel") {
    const cards = ad.cards?.length ? ad.cards : [{}, {}];
    return (
      <div className="flex gap-2 overflow-x-auto px-3 pb-1">
        {cards.map((c, i) => (
          <div key={c.key || i} className="w-[68%] shrink-0 overflow-hidden rounded-md border border-[#dadde1] bg-white">
            <div className="grid place-items-center bg-[#F0F2F5]" style={{ aspectRatio: "1 / 1" }}>
              {c.imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imagePreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon size={22} className="text-[#BCC0C4]" aria-hidden="true" />
              )}
            </div>
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <span className="truncate text-[12px] font-semibold text-[#050505]">{c.headline || ad.headline || "Headline"}</span>
              {cta && <span className="shrink-0 rounded bg-[#E4E6EB] px-2 py-1 text-[11px] font-semibold text-[#050505]">{cta}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  }
  const src = ad.format === "video" ? ad.thumbnailPreview || ad.videoPreview : ad.imagePreview;
  return (
    <div className={`relative grid place-items-center overflow-hidden ${dark ? "bg-black" : "bg-[#F0F2F5]"}`} style={{ aspectRatio: ratio }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-1 text-[11px] text-[#8A8D91]">
          <ImageIcon size={24} aria-hidden="true" />
          {ad.format === "video" ? "Choose a video" : "Choose an image"}
        </span>
      )}
      {ad.format === "video" && (
        <span className="absolute grid h-11 w-11 place-items-center rounded-full bg-black/55 text-white">
          <Play size={20} fill="currentColor" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

function Text({ text, limit = 125, more = "See more" }) {
  const t = String(text || "");
  if (!t) return <span className="text-[#8A8D91]">Primary text</span>;
  if (t.length <= limit) return <span className="whitespace-pre-line">{t}</span>;
  return (
    <span className="whitespace-pre-line">
      {t.slice(0, limit).trimEnd()}… <span className="font-semibold text-[#65676B]">{more}</span>
    </span>
  );
}

function FacebookFeed({ ad, page, cta }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#dadde1] bg-white text-[13px] text-[#050505] shadow-sm">
      <div className="flex items-center gap-2 px-3 pt-3">
        <Avatar src={page?.picture} name={page?.name} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="m-0 truncate text-[13px] font-semibold">{page?.name || "Your Page"}</p>
          <p className="m-0 flex items-center gap-1 text-[11.5px] text-[#65676B]">
            Sponsored · <Globe size={10} aria-hidden="true" />
          </p>
        </div>
        <MoreHorizontal size={16} className="text-[#65676B]" aria-hidden="true" />
      </div>
      <p className="m-0 px-3 py-2 leading-snug">
        <Text text={ad.primaryText} />
      </p>
      <Media ad={ad} cta={cta} />
      {ad.format !== "carousel" && (
        <div className="flex items-center justify-between gap-3 bg-[#F0F2F5] px-3 py-2">
          <div className="min-w-0">
            <p className="m-0 truncate text-[11px] uppercase text-[#65676B]">{host(ad.link) || "your-store.com"}</p>
            <p className="m-0 truncate text-[13px] font-semibold">{ad.headline || "Headline"}</p>
            {ad.description && <p className="m-0 truncate text-[12px] text-[#65676B]">{ad.description}</p>}
          </div>
          {cta && <span className="shrink-0 rounded-md bg-[#E4E6EB] px-3 py-1.5 text-[12px] font-semibold">{cta}</span>}
        </div>
      )}
      <div className="mx-3 flex justify-around border-t border-[#dadde1] py-1.5 text-[12px] font-semibold text-[#65676B]">
        <span className="inline-flex items-center gap-1">
          <ThumbsUp size={14} aria-hidden="true" /> Like
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle size={14} aria-hidden="true" /> Comment
        </span>
        <span className="inline-flex items-center gap-1">
          <Share2 size={14} aria-hidden="true" /> Share
        </span>
      </div>
    </div>
  );
}

function InstagramFeed({ ad, ig, page, cta }) {
  const name = ig?.username || page?.name || "yourbrand";
  return (
    <div className="overflow-hidden rounded-lg border border-[#dbdbdb] bg-white text-[13px] text-[#262626] shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2">
        <Avatar src={ig?.picture || page?.picture} name={name} size={28} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="m-0 truncate text-[13px] font-semibold">{name}</p>
          <p className="m-0 text-[11px]">Sponsored</p>
        </div>
        <MoreHorizontal size={16} aria-hidden="true" />
      </div>
      <Media ad={ad} cta={cta} />
      {cta && ad.format !== "carousel" && (
        <div className="flex items-center justify-between bg-[#0095F6] px-3 py-2 text-[13px] font-semibold text-white">
          {cta} <span aria-hidden="true">›</span>
        </div>
      )}
      <div className="flex items-center gap-3 px-3 pt-2">
        <Heart size={20} aria-hidden="true" />
        <MessageCircle size={20} aria-hidden="true" />
        <Send size={20} aria-hidden="true" />
        <Bookmark size={20} className="ml-auto" aria-hidden="true" />
      </div>
      <p className="m-0 px-3 pb-3 pt-1.5 leading-snug">
        <span className="font-semibold">{name}</span> <Text text={ad.primaryText} limit={90} more="more" />
      </p>
    </div>
  );
}

function Story({ ad, ig, page, cta }) {
  const name = ig?.username || page?.name || "yourbrand";
  return (
    <div className="relative mx-auto overflow-hidden rounded-xl bg-black text-white shadow-sm" style={{ aspectRatio: "9 / 16", maxWidth: 260 }}>
      <div className="absolute inset-0">
        <Media ad={{ ...ad, format: ad.format === "carousel" ? "image" : ad.format, imagePreview: ad.imagePreview || ad.cards?.[0]?.imagePreview }} ratio="9 / 16" dark />
      </div>
      <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/60 to-transparent px-3 pb-6 pt-3">
        <Avatar src={ig?.picture || page?.picture} name={name} size={26} />
        <span className="truncate text-[12px] font-semibold">{name}</span>
        <span className="text-[11px] opacity-80">Sponsored</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-10 text-center">
        {ad.primaryText && <p className="m-0 line-clamp-2 text-[12px] leading-snug">{ad.primaryText}</p>}
        {cta && (
          <span className="inline-flex flex-col items-center text-[12px] font-semibold">
            <ChevronUp size={16} aria-hidden="true" />
            <span className="rounded-full bg-white px-4 py-1.5 text-[#262626]">{cta}</span>
          </span>
        )}
      </div>
    </div>
  );
}

/** Meta's own rendering of the ad (needs the media uploaded and a Page). */
function MetaPreviews({ ad, goal, open, onClose }) {
  const api = useAdsCoach();
  const [data, setData] = useState(null);
  const labels = { facebook_feed: "Facebook Feed", instagram_feed: "Instagram Feed", instagram_story: "Instagram Stories", instagram_reels: "Instagram Reels" };
  const load = async () => {
    setData(null);
    try {
      setData(await api.request("/previews", { method: "POST", body: { ad, goal, formats: Object.keys(labels) } }));
    } catch (err) {
      setData({ error: { error: err.message } });
    }
  };
  return (
    <Modal open={open} onCancel={onClose} afterOpenChange={(o) => o && load()} footer={null} width="min(1340px, 100vw)" title="Preview from Meta">
      {!data ? (
        <div className="py-16 text-center">
          <Spin />
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Object.entries(data).map(([k, v]) => (
            <div key={k} className="shrink-0">
              <p className="m-0 mb-1 text-xs text-ink-muted">{labels[k] || k}</p>
              {v.src ? <iframe title={labels[k] || k} src={v.src} className="rounded-md border border-app-border bg-white" style={{ width: 300, height: k.includes("story") || k.includes("reels") ? 540 : 470 }} /> : <p className="w-60 text-xs text-status-danger">{v.error || "No preview"}</p>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/** Live preview of one ad as people would see it, on Facebook, Instagram
 * or in Stories — updated as the fields change. */
export function AdPreview({ ad, caps, goal }) {
  const [where, setWhere] = useState("facebook");
  const [meta, setMeta] = useState(false);
  const page = caps?.pages?.find((p) => p.id === ad.identity?.pageId);
  const ig = (caps?.instagramAccounts || []).find((i) => i.id === ad.identity?.instagramId);
  const whatsapp = caps?.goals?.[goal]?.destination === "WHATSAPP";
  const cta = whatsapp ? "Send message" : ad.cta ? ctaLabel(ad.cta) : null;
  const hasMedia = ad.imageHash || ad.videoId || ad.cards?.some((c) => c.imageHash);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="m-0 text-[14px] font-semibold">Ad preview</h3>
        <Segmented size="small" value={where} onChange={setWhere} options={[{ value: "facebook", label: "Facebook" }, { value: "instagram", label: "Instagram" }, { value: "story", label: "Stories" }]} />
      </div>
      {where === "facebook" && <FacebookFeed ad={ad} page={page} cta={cta} />}
      {where === "instagram" && <InstagramFeed ad={ad} ig={ig} page={page} cta={cta} />}
      {where === "story" && <Story ad={ad} ig={ig} page={page} cta={cta} />}
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-[11.5px] text-ink-subtle">How it looks may vary by device.</p>
        <Button size="small" disabled={!hasMedia || !page} onClick={() => setMeta(true)}>
          Preview from Meta
        </Button>
      </div>
      <MetaPreviews ad={ad} goal={goal} open={meta} onClose={() => setMeta(false)} />
    </div>
  );
}
