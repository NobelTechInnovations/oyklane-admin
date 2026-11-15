"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Skeleton, Dropdown, App } from "antd";
import { Palette, Code2, Eye, Sparkles, MoreHorizontal, Trash2, Lock, Copy, ExternalLink } from "lucide-react";
import { PageHeader, StatusBadge, useConfirmDialog } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { LivePreview } from "@/components/themes/LivePreview";

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3002";
const MARKET_THEMES = `${process.env.NEXT_PUBLIC_MARKET_ORIGIN || "https://market.oyklane.com"}/themes`;

// Previews open on the store's own Oyklane address (never a hosting URL).
function previewUrl(store, themeId) {
  const base = store.oyklaneUrl || `${STOREFRONT_URL}/store/${store.handle}`;
  return `${base.replace(/\/$/, "")}/?themeId=${themeId}`;
}

const hostOf = (u) => String(u || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");

export default function ThemesPage() {
  const { message } = App.useApp();
  const { confirmDialog } = useConfirmDialog();
  const [themes, setThemes] = useState([]);
  const [available, setAvailable] = useState({});
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    const [themesData, storeData] = await Promise.all([apiFetch("/api/themes"), apiFetch("/api/store")]);
    setThemes(themesData.themes);
    setAvailable(themesData.available);
    setStore(storeData.store);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  const [added, setAdded] = useState(null);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("added");
    if (id) {
      setAdded(id);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function run(key, fn, success) {
    setBusy(key);
    try {
      await fn();
      if (success) message.success(success);
      await load();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  const install = (handle) =>
    run(`install-${handle}`, () => apiFetch("/api/themes/install", { method: "POST", body: { handle } }), `${available[handle].name} ${available[handle].version} added — preview it, then publish when you're ready`);
  const publish = (theme) =>
    confirmDialog({
      title: `Publish ${theme.name}?`,
      description: "It replaces your current theme on the live store straight away. Your current theme stays installed, so you can switch back any time.",
      okText: "Publish",
      onConfirm: () => run(`publish-${theme.id}`, () => apiFetch(`/api/themes/${theme.id}/activate`, { method: "POST" }), `${theme.name} is live`),
    });
  const duplicate = (theme) =>
    run(`dup-${theme.id}`, () => apiFetch(`/api/themes/${theme.id}/duplicate`, { method: "POST" }), `Copy of ${theme.name} made — change it, preview it, then publish when ready. Your live store doesn't change until then.`);
  const remove = (theme) =>
    confirmDialog({
      title: `Delete ${theme.name}?`,
      description: "Its customisations and code changes are deleted too. This can't be undone.",
      okText: "Delete theme",
      danger: true,
      onConfirm: () => run(`delete-${theme.id}`, () => apiFetch(`/api/themes/${theme.id}`, { method: "DELETE" }), "Theme deleted"),
    });

  if (loading) {
    return (
      <div>
        <PageHeader title="Themes" />
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  const live = themes.find((t) => t.isActive);
  const others = themes.filter((t) => !t.isActive);
  const liveHasUpdate = live?.updateAvailable && !live.market && !themes.some((t) => t.handle === live.handle && t.version === live.latestVersion);
  // Oyklane Store themes update in place, when the seller chooses.
  const storeUpdates = themes.filter((t) => t.market && t.updateAvailable);

  return (
    <div>
      <PageHeader
        title="Themes"
        subtitle="Your theme designs the home page, header and footer, and sets the fonts and colours for your whole store."
        actions={
          <a href={MARKET_THEMES} target="_blank" rel="noopener noreferrer">
            <Button type="primary" icon={<Sparkles size={15} aria-hidden="true" />}>View more themes</Button>
          </a>
        }
      />

      <div className="mb-6 flex items-start gap-3 rounded-[14px] border border-app-border bg-app-surface px-4 py-3 shadow-card">
        <Lock size={16} className="text-ink-muted mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-[13px] text-ink-muted m-0">
          Product, collection, cart, checkout and account pages use Oyklane's built-in design on every theme — tested for speed and conversion. They follow your theme's
          fonts and colours automatically.
        </p>
      </div>

      {added && themes.some((t) => t.id === added) && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3">
          <p className="text-sm text-ink m-0">
            <strong className="font-semibold">{themes.find((t) => t.id === added).name} is added.</strong> Customise it and publish when you're ready — your live store doesn't change until then.
          </p>
          <Link href={`/theme-editor/${added}`}>
            <Button type="primary" icon={<Palette size={15} aria-hidden="true" />}>Customize</Button>
          </Link>
        </div>
      )}

      {liveHasUpdate && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-accent/30 bg-accent/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="text-accent mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-sm text-ink m-0">
              <strong className="font-semibold">
                {available[live.handle]?.name} {live.latestVersion} is available.
              </strong>{" "}
              Add it as a new theme to try the redesign — your live store doesn't change until you publish it.
            </p>
          </div>
          <Button type="primary" loading={busy === `install-${live.handle}`} onClick={() => install(live.handle)}>
            Add {available[live.handle]?.name} {live.latestVersion}
          </Button>
        </div>
      )}

      {storeUpdates.map((t) => (
        <div key={t.id} className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-accent/30 bg-accent/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="text-accent mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-sm text-ink m-0">
              <strong className="font-semibold">
                {t.name} {t.latestVersion} is available.
              </strong>{" "}
              Update it when you're ready. Your layouts and settings stay as they are.
            </p>
          </div>
          <Link href={`/admin/market/theme/${encodeURIComponent(t.market.slug)}`}>
            <Button type="primary">Review update</Button>
          </Link>
        </div>
      ))}

      {live && store && (
        <Card className="mb-8 overflow-hidden" styles={{ body: { padding: 0 } }}>
          <div className="bg-app-bg px-5 pb-8 pt-6 sm:px-10 sm:pt-8">
            <LivePreview src={previewUrl(store, live.id)} title={`${live.name} preview`} url={hostOf(store.oyklaneUrl) || `${store.handle}.oyklane.com`} phone className="mx-auto max-w-[920px]" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-app-border px-5 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="m-0 text-[17px] font-semibold text-ink" style={{ letterSpacing: "-0.01em" }}>
                  {live.name}
                </h2>
                <StatusBadge status="live" label="Current theme" />
                <span className="text-xs text-ink-muted tabular-nums">v{live.version}</span>
              </div>
              {live.description && <p className="m-0 mt-1 max-w-[640px] truncate text-[13px] text-ink-muted">{live.description}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Dropdown
                trigger={["click"]}
                placement="bottomRight"
                menu={{
                  items: [
                    { key: "view", icon: <ExternalLink size={14} />, label: <a href={previewUrl(store, live.id)} target="_blank" rel="noopener noreferrer">View store</a> },
                    ...(live.locked ? [] : [{ key: "code", icon: <Code2 size={14} />, label: <Link href={`/theme-editor/${live.id}/code`}>Edit code</Link> }]),
                    { key: "duplicate", icon: <Copy size={14} />, label: "Duplicate", onClick: () => duplicate(live) },
                  ],
                }}
              >
                <Button icon={<MoreHorizontal size={16} aria-hidden="true" />} loading={busy === `dup-${live.id}`} aria-label={`More actions for ${live.name}`} />
              </Dropdown>
              <a href={previewUrl(store, live.id)} target="_blank" rel="noopener noreferrer" className="hidden sm:inline-block">
                <Button icon={<Eye size={15} aria-hidden="true" />}>View store</Button>
              </a>
              <Link href={`/theme-editor/${live.id}`}>
                <Button type="primary" icon={<Palette size={15} aria-hidden="true" />}>
                  Customize
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {others.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="m-0 text-[15px] font-semibold text-ink">Theme library</h2>
            <span className="text-[13px] text-ink-muted">Installed, not published — only you can see these</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {others.map((theme) => (
              <Card key={theme.id} size="small" styles={{ body: { padding: 14 } }}>
                <LivePreview src={previewUrl(store, theme.id)} title={`${theme.name} preview`} />
                <div className="flex items-start justify-between gap-2 mt-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold m-0 truncate">{theme.name}</h3>
                    <p className="text-xs text-ink-muted m-0">
                      v{theme.version} · added {new Date(theme.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {theme.listingId ? " · Oyklane Store" : ""}
                    </p>
                  </div>
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: [
                        ...(theme.locked ? [] : [{ key: "code", icon: <Code2 size={14} />, label: <Link href={`/theme-editor/${theme.id}/code`}>Edit code</Link> }]),
                        { key: "duplicate", icon: <Copy size={14} />, label: "Duplicate", onClick: () => duplicate(theme) },
                        { key: "delete", icon: <Trash2 size={14} />, danger: true, label: "Delete", onClick: () => remove(theme) },
                      ],
                    }}
                  >
                    <Button size="small" type="text" icon={<MoreHorizontal size={16} aria-hidden="true" />} aria-label={`More actions for ${theme.name}`} />
                  </Dropdown>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <a href={previewUrl(store, theme.id)} target="_blank" rel="noopener noreferrer" className="mr-auto">
                    <Button size="small" type="text" icon={<Eye size={14} aria-hidden="true" />}>
                      Preview
                    </Button>
                  </a>
                  <Link href={`/theme-editor/${theme.id}`}>
                    <Button size="small">Customize</Button>
                  </Link>
                  <Button size="small" type="primary" loading={busy === `publish-${theme.id}`} onClick={() => publish(theme)}>
                    Publish
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {others.length === 0 && (
        <Card styles={{ body: { padding: 20 } }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm text-ink-muted">Find more free and paid themes on the Oyklane Store. Pick one, click Add to my store, and it lands here ready to customise.</p>
            <a href={MARKET_THEMES} target="_blank" rel="noopener noreferrer">
              <Button icon={<Sparkles size={15} aria-hidden="true" />}>Browse themes</Button>
            </a>
          </div>
        </Card>
      )}
    </div>
  );
}
