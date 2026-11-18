"use client";

import { useCallback, useEffect, useState } from "react";
import { App, Button, Empty, Modal, Popconfirm, Segmented, Spin, Tag, Upload } from "antd";
import { Check, Film, Trash2, UploadCloud } from "lucide-react";
import { useAdsCoach } from "../context";

const ACCEPT = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime";

/** The ad account's media library (images and videos uploaded to Meta). */
export function useLibrary() {
  const api = useAdsCoach();
  const [items, setItems] = useState(null);
  const load = useCallback(
    () =>
      api
        .request("/media")
        .then((d) => setItems(d.media))
        .catch(() => setItems([])),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load]);
  return { items, load };
}

function UploadButton({ onUploaded, kind }) {
  const api = useAdsCoach();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  return (
    <Upload
      showUploadList={false}
      accept={kind === "image" ? "image/jpeg,image/png,image/webp" : kind === "video" ? "video/mp4,video/quicktime" : ACCEPT}
      beforeUpload={(file) => {
        const isVideo = file.type.startsWith("video/");
        const max = isVideo ? 200 : 30;
        if (file.size > max * 1024 * 1024) {
          message.error(`${isVideo ? "Videos" : "Images"} must be under ${max} MB.`);
          return Upload.LIST_IGNORE;
        }
        return true;
      }}
      customRequest={async ({ file }) => {
        setBusy(true);
        const fd = new FormData();
        fd.append("file", file);
        try {
          const res = await fetch(api.url("/media"), { method: "POST", credentials: "include", body: fd });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || data.message || "Upload failed");
          if (data.media.warning) message.warning(data.media.warning);
          else message.success(data.media.kind === "video" ? "Uploaded. Meta is processing the video (usually a minute or two)." : "Uploaded");
          onUploaded(data.media);
        } catch (err) {
          message.error({ content: err.message, duration: 8 });
        } finally {
          setBusy(false);
        }
      }}
    >
      <Button icon={<UploadCloud size={14} aria-hidden="true" />} loading={busy}>
        Upload {kind === "video" ? "a video" : kind === "image" ? "an image" : "images or videos"}
      </Button>
    </Upload>
  );
}

function Tile({ m, selected, onClick, onRemove }) {
  return (
    <div className={`relative overflow-hidden rounded-md border bg-app-bg ${selected ? "border-accent ring-2 ring-accent" : "border-app-border"}`}>
      <button type="button" onClick={onClick} className="block aspect-square w-full" disabled={!onClick || m.status !== "ready"} aria-label={`Choose ${m.name}`}>
        {m.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-ink-muted">{m.kind === "video" ? <Film size={22} aria-hidden="true" /> : null}</span>
        )}
      </button>
      {m.kind === "video" && (
        <Tag className="!absolute left-1 top-1 !m-0" color={m.status === "ready" ? "default" : m.status === "error" ? "red" : "blue"}>
          {m.status === "ready" ? "Video" : m.status === "error" ? "Failed" : "Processing"}
        </Tag>
      )}
      {selected && (
        <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-white">
          <Check size={12} aria-hidden="true" />
        </span>
      )}
      <div className="flex items-center justify-between gap-1 px-1.5 py-1 text-[11px]">
        <span className="truncate">{m.name}</span>
        {onRemove && (
          <Popconfirm title="Remove from the library?" description="Ads already using it keep working." onConfirm={() => onRemove(m)}>
            <button type="button" className="text-ink-muted hover:text-status-danger" aria-label={`Remove ${m.name}`}>
              <Trash2 size={12} aria-hidden="true" />
            </button>
          </Popconfirm>
        )}
      </div>
      {m.error && <p className="m-0 px-1.5 pb-1 text-[11px] text-status-danger">{m.error}</p>}
    </div>
  );
}

/** Choose (or upload) one image or video for an ad. */
export function MediaPicker({ open, onClose, onPick, kind = "image" }) {
  const { items, load } = useLibrary();
  const [picked, setPicked] = useState(null);
  useEffect(() => {
    if (open) {
      setPicked(null);
      load();
    }
  }, [open, load]);
  const list = (items || []).filter((m) => m.kind === kind);
  return (
    <Modal open={open} onCancel={onClose} title={kind === "video" ? "Choose a video" : "Choose an image"} width="min(760px, 100vw)" okText="Use it" okButtonProps={{ disabled: !picked }} onOk={() => onPick(picked)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-xs text-ink-muted">{kind === "image" ? "Square 1080×1080 or portrait 1080×1350 work in every placement." : "MP4 or MOV. Vertical 9:16 for Reels and Stories, square for feeds."}</p>
        <UploadButton
          kind={kind}
          onUploaded={(m) => {
            load();
            if (m.status === "ready") setPicked(m);
          }}
        />
      </div>
      {items === null ? (
        <div className="py-10 text-center">
          <Spin />
        </div>
      ) : list.length ? (
        <div className="grid max-h-[55vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
          {list.map((m) => (
            <Tile key={m.id} m={m} selected={picked?.id === m.id} onClick={() => setPicked(m)} />
          ))}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No ${kind}s in the library yet. Upload one.`} />
      )}
    </Modal>
  );
}

/** The Media library tab: everything uploaded to the ad account. */
export function AdsMediaLibrary() {
  const api = useAdsCoach();
  const { message } = App.useApp();
  const { items, load } = useLibrary();
  const [kind, setKind] = useState("all");
  useEffect(() => {
    if (!(items || []).some((m) => m.status === "processing")) return undefined;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [items, load]);
  const list = (items || []).filter((m) => kind === "all" || m.kind === kind);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap justify-between gap-2">
        <Segmented value={kind} onChange={setKind} options={[{ value: "all", label: "All" }, { value: "image", label: "Images" }, { value: "video", label: "Videos" }]} />
        <UploadButton onUploaded={load} />
      </div>
      <p className="m-0 text-xs text-ink-muted">Files are uploaded to the Meta ad account and reused across ads. Images: JPG, PNG or WebP up to 30 MB, at least 600 px. Videos: MP4 or MOV up to 200 MB.</p>
      {items === null ? (
        <div className="py-10 text-center">
          <Spin />
        </div>
      ) : list.length ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
          {list.map((m) => (
            <Tile
              key={m.id}
              m={m}
              onRemove={async (x) => {
                try {
                  await api.request(`/media/${x.id}`, { method: "DELETE" });
                  load();
                } catch (err) {
                  message.error(err.message);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing uploaded yet." />
      )}
    </div>
  );
}
