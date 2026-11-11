"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Tag, Skeleton } from "antd";
import { Search, Crown, Lock, Check, ArrowRight, Sparkles } from "lucide-react";
import { PageHeader, EmptyState } from "@shopcycle/ui";
import { useApps, appHref, detailsHref, APP_CATEGORIES, rupees, usageLabel } from "@/lib/apps";
import { useAppActions } from "@/components/apps/useAppActions";
import { AppTile } from "@/components/apps/AppTile";
import { apiFetch } from "@/lib/api";

function PriceTag({ app }) {
  if (app.usagePrice) {
    return (
      <span className="text-[12px] text-ink-muted" title="Free to install. Plus GST, billed with your plan">
        {usageLabel(app)}
      </span>
    );
  }
  if (app.priceMonthly) {
    return (
      <span className="text-[12px] text-ink-muted" title="Plus GST, billed with your plan">
        {rupees(app.priceMonthly)}/month
      </span>
    );
  }
  return <span className="text-[12px] text-ink-muted">Free</span>;
}

function AppCard({ app }) {
  const router = useRouter();
  const { install } = useAppActions();
  const [busy, setBusy] = useState(false);
  const needsSetup = (app.settingsSchema || []).length > 0;

  async function onInstall(e) {
    e.preventDefault();
    if (needsSetup) return router.push(detailsHref(app));
    setBusy(true);
    const ok = await install(app);
    setBusy(false);
    if (ok) router.push(appHref(app));
  }

  return (
    <Link
      href={detailsHref(app)}
      className="group flex flex-col bg-app-surface border border-app-border rounded-[14px] p-[18px] no-underline shadow-card hover:shadow-raised hover:border-[#DADAE0] transition-all"
    >
      <div className="flex items-start gap-3">
        <AppTile app={app} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="m-0 font-semibold text-[15px] text-ink truncate">{app.name}</p>
            {app.installed && <Check size={14} className="text-status-success shrink-0" aria-label="Installed" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[12px] text-ink-subtle">{APP_CATEGORIES[app.category] || "Other"}</span>
            <span className="text-ink-subtle text-[10px]">•</span>
            <PriceTag app={app} />
          </div>
        </div>
        {app.premium && (
          <Tag className="!mr-0 !border-0 !bg-accent-soft !text-accent inline-flex items-center gap-1">
            <Crown size={11} aria-hidden="true" /> Growth+
          </Tag>
        )}
      </div>
      <p className="text-[13px] text-ink-muted mt-3 mb-4 leading-relaxed line-clamp-3">{app.description}</p>
      <div className="flex items-center justify-between gap-2 mt-auto">
        {app.installed ? (
          <>
            <span className="text-[12px] font-medium text-status-success inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success" aria-hidden="true" /> Installed
            </span>
            <Button
              size="small"
              onClick={async (e) => {
                e.preventDefault();
                // A developer's app (Oyklane Store) opens on its own site, signed for this store.
                if (!app.marketplace) return router.push(appHref(app));
                const tab = window.open("", "_blank");
                try {
                  const { url } = await apiFetch(`/api/market/store/apps/${app.key}/open`);
                  if (tab) tab.location.href = url;
                  else window.location.href = url;
                } catch {
                  tab?.close();
                  router.push(appHref(app));
                }
              }}
            >
              Open
            </Button>
            {app.marketplace && app.settingsSchema?.length > 0 && (
              <Button size="small" onClick={() => router.push(appHref(app))}>
                Settings
              </Button>
            )}
          </>
        ) : app.locked ? (
          <>
            <span className="text-[12px] text-ink-muted">On Growth and Pro</span>
            <Button size="small" icon={<Lock size={12} aria-hidden="true" />} onClick={(e) => { e.preventDefault(); router.push("/admin/settings/billing"); }}>
              Upgrade
            </Button>
          </>
        ) : (
          <>
            <span className="text-[12px] text-ink-subtle group-hover:text-ink inline-flex items-center gap-1 transition-colors">
              Details <ArrowRight size={12} aria-hidden="true" />
            </span>
            <Button size="small" type="primary" loading={busy} onClick={onInstall}>
              {needsSetup ? "Set up" : "Install"}
            </Button>
          </>
        )}
      </div>
    </Link>
  );
}

function FeaturedFlow({ app }) {
  const router = useRouter();
  const { install } = useAppActions();
  const [busy, setBusy] = useState(false);
  if (!app) return null;
  return (
    <section className="relative overflow-clip rounded-[16px] mb-6 p-6 sm:p-7 text-white" style={{ background: "radial-gradient(120% 140% at 0% 0%, #0078d4 0%, #4C33C9 45%, #111114 100%)" }}>
      <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full opacity-30" style={{ background: "radial-gradient(circle, #2B9FE6 0%, transparent 70%)" }} aria-hidden="true" />
      <div className="relative flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] bg-white/15 rounded-full px-2.5 py-1">
            <Sparkles size={12} aria-hidden="true" /> New app
          </span>
          <h2 className="text-[22px] font-semibold mt-3 mb-1.5" style={{ letterSpacing: "-0.02em" }}>
            Flow — emails that send themselves
          </h2>
          <p className="text-[14px] text-white/80 m-0 max-w-xl leading-relaxed">
            Thank first-time buyers, ask for reviews after delivery, win back quiet customers and follow up abandoned checkouts. Pick a recipe, switch it on.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {app.installed ? (
            <Button size="large" className="!bg-white !text-ink !border-white font-semibold" onClick={() => router.push(appHref(app))}>
              Open Flow
            </Button>
          ) : (
            <Button
              size="large"
              loading={busy}
              className="!bg-white !text-ink !border-white font-semibold"
              onClick={async () => {
                setBusy(true);
                const ok = await install(app);
                setBusy(false);
                if (ok) router.push(appHref(app));
              }}
            >
              Install free
            </Button>
          )}
          <Button size="large" ghost onClick={() => router.push(detailsHref(app))}>
            Learn more
          </Button>
        </div>
      </div>
      <ol className="relative hidden md:flex flex-wrap items-center gap-2 mt-6 mb-0 p-0 list-none text-[12.5px]" aria-label="An example flow">
        {["Order delivered", "Wait 3 days", "Not refunded?", "Email: How was it?"].map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span className="rounded-lg bg-white/10 border border-white/20 px-3 py-1.5 backdrop-blur-sm">{step}</span>
            {i < 3 && <ArrowRight size={14} className="text-white/60" aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </section>
  );
}

// The apps most stores get the most from, in order — the Apps page shows
// the first six a store doesn't have yet; the rest are in the Oyklane Store.
const TOP = ["whatsapp", "one-click-checkout", "product-reviews", "meta-ads", "google-shopping", "bundles", "phone-login", "google-ads", "shoppable-videos", "shiprocket", "flow", "instagram-feed", "google-reviews"];
const MARKET = `${process.env.NEXT_PUBLIC_MARKET_ORIGIN || "https://market.oyklane.com"}/apps`;

export default function AppsPage() {
  const { apps, loading } = useApps();

  const installed = useMemo(() => (apps || []).filter((a) => a.installed).sort((a, b) => a.name.localeCompare(b.name)), [apps]);
  const picks = useMemo(() => {
    const rank = (a) => (TOP.indexOf(a.key) === -1 ? 999 : TOP.indexOf(a.key));
    return (apps || [])
      .filter((a) => !a.installed)
      .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
      .slice(0, 6);
  }, [apps]);
  const more = Math.max(0, (apps || []).length - installed.length - picks.length);

  const grid = (list) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {list.map((app) => (
        <AppCard key={app.id} app={app} />
      ))}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Apps"
        subtitle="Add features to your store. Installed apps are pinned in your sidebar."
        actions={
          <a href={MARKET} target="_blank" rel="noopener noreferrer">
            <Button icon={<Sparkles size={15} aria-hidden="true" />}>Browse all apps</Button>
          </a>
        }
      />
      <FeaturedFlow app={(apps || []).find((a) => a.key === "flow")} />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-app-surface border border-app-border rounded-[14px] p-5">
              <Skeleton avatar active paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {installed.length > 0 && (
            <section className="mb-8" aria-labelledby="apps-installed">
              <h2 id="apps-installed" className="m-0 mb-3 text-[15px] font-semibold text-ink">
                Installed <span className="font-normal text-ink-subtle">{installed.length}</span>
              </h2>
              {grid(installed)}
            </section>
          )}
          {picks.length > 0 && (
            <section className="mb-8" aria-labelledby="apps-picks">
              <h2 id="apps-picks" className="m-0 mb-3 text-[15px] font-semibold text-ink">
                Most useful for your store
              </h2>
              {grid(picks)}
            </section>
          )}
          {!installed.length && !picks.length && <EmptyState icon={<Search />} title="No apps yet" description="Browse the Oyklane Store to add features to your store." />}

          <a
            href={MARKET}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[14px] border border-app-border bg-app-surface px-6 py-5 no-underline text-ink hover:border-[#C9C9D1] transition-colors"
          >
            <span>
              <span className="block text-[15px] font-semibold">Every app is in the Oyklane Store</span>
              <span className="block mt-1 text-[13.5px] text-ink-muted">
                {more > 0 ? `${more} more app${more === 1 ? "" : "s"} — ` : ""}marketing, shipping, payments, automation and more. Install in one click.
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[13.5px] font-semibold">
              Open the Oyklane Store <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </a>

          <p className="text-[13px] text-ink-muted mt-6">
            Missing something your store needs?{" "}
            <Link href="/admin/support?new=feature" className="text-ink font-medium">
              Tell us
            </Link>{" "}
            — new apps are on the way.
          </p>
        </>
      )}
    </div>
  );
}
