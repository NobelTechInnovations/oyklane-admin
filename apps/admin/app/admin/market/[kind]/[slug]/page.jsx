"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { App, Alert, Button, Card, Input, Skeleton, Tag } from "antd";
import { ExternalLink, ShieldCheck, Store } from "lucide-react";
import { formatCurrency } from "@shopcycle/utils";
import { PageHeader } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { openCheckout, payuReturn, submitPayu } from "@/lib/billing";

const MARKET = process.env.NEXT_PUBLIC_MARKET_ORIGIN || "https://market.oyklane.com";
const inr = (n) => formatCurrency(Number(n || 0), "INR");
const day = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * Get something from the Oyklane Store (market.oyklane.com sends sellers
 * here — they're signed in to their store here). Free: install. Paid
 * theme: one payment for a year (the API checks it with the gateway before
 * the licence exists), then install with the purchase code. From here the
 * seller also takes a new version, uninstalls, renews or applies for a
 * refund. Apps install from here too.
 */
export default function MarketGetPage({ params }) {
  const { kind, slug } = use(params);
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState(null);
  const [typedCode, setTypedCode] = useState(null);
  const auto = useSearchParams().get("install") === "1";
  const autoRan = useRef(false);

  const load = useCallback(async () => {
    try {
      const next = await apiFetch(`/api/market/store/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}`);
      setData(next);
      return next;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [kind, slug]);
  useEffect(() => {
    load();
    // Back from PayU's page: the API has already checked the payment.
    const back = payuReturn();
    if (!back) return;
    if (back.status === "success") message.success("Paid — it's yours. Add it to your themes when you're ready.");
    else if (back.status === "pending") {
      message.info("Your payment is being confirmed — this page updates in a moment.");
      setTimeout(load, 5000);
    } else message.error(back.reason || "The payment didn't go through.");
  }, [load, message]);

  async function run(key, fn) {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      if (!err.cancelled) message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  const theme = kind === "theme";
  const themeAction = (action, body = {}) => apiFetch(`/api/market/store/themes/${encodeURIComponent(slug)}/${action}`, { method: "POST", body });
  // The code comes filled in from the licence; it stays on the page to copy.
  const purchaseCode = typedCode ?? data?.license?.code ?? "";

  const installTheme = () =>
    run("install", async () => {
      const out = data.official
        ? (await apiFetch("/api/themes/install", { method: "POST", body: { handle: slug } })).theme
        : await themeAction("install", purchaseCode ? { purchaseCode } : {});
      const themeId = out.themeId || out.id;
      setDone({ themeId });
      message.success(`${data.item.name} added to your themes`);
      if (auto) router.replace(`/admin/online-store/themes?added=${encodeURIComponent(themeId)}`);
    });

  // Shopify-style: "Add to my store" on the Oyklane Store lands here with
  // ?install=1 — a free theme installs straight away.
  useEffect(() => {
    if (!auto || autoRan.current || !data || kind !== "theme") return;
    const free = data.official || data.item.free || data.owned;
    if (!free) return;
    autoRan.current = true;
    if (data.installed && data.official) return router.replace("/admin/online-store/themes");
    installTheme();
  });

  const buy = () =>
    run("buy", async () => {
      const renewing = Boolean(data.license);
      const started = await themeAction("buy");
      // PayU: its own page, which comes back to this one (?payu=).
      if (started.checkout?.provider === "payu") return submitPayu(started.checkout);
      if (!started.owned) {
        const paid = await openCheckout(started.checkout);
        const verified = await apiFetch("/api/market/store/verify", { method: "POST", body: paid });
        if (!verified.owned) {
          message.info("Your payment is being confirmed — this page updates in a moment.");
          setTimeout(load, 5000);
          return;
        }
      }
      const fresh = await load();
      if (renewing) return message.success("Renewed for another year.");
      message.success("Paid — it's yours. Installing…");
      const out = await themeAction("install", { purchaseCode: fresh?.license?.code });
      setDone({ themeId: out.themeId });
      await load();
    });

  const update = () =>
    modal.confirm({
      title: `Update to version ${data.update.to}?`,
      content: (
        <div className="text-[13px]">
          {data.update.changelog && <p className="mb-2 whitespace-pre-line">{data.update.changelog}</p>}
          <p className="m-0 text-ink-muted">Your theme stays the same one, and your layouts and settings stay as they are. Its code moves to the new version.</p>
        </div>
      ),
      okText: "Update",
      onOk: () =>
        run("update", async () => {
          await themeAction("update");
          message.success(`Updated to version ${data.update.to}`);
          await load();
        }),
    });

  const uninstall = () =>
    modal.confirm({
      title: `Uninstall ${data.item.name}?`,
      content: <p className="m-0 text-[13px]">It comes off your themes, with every copy of it and your changes to them.{data.license ? " You can install it again until your licence ends." : ""}</p>,
      okText: "Uninstall",
      okButtonProps: { danger: true },
      onOk: () =>
        run("uninstall", async () => {
          await themeAction("uninstall");
          message.success("Uninstalled");
          await load();
        }),
    });

  const applyForRefund = () => {
    let reason = "";
    modal.confirm({
      title: "Refund this theme?",
      content: (
        <div className="text-[13px]">
          <p className="mb-2">{inr(data.price?.total)} goes back to the way you paid, straight away. Your purchase code stops working.</p>
          <Input.TextArea rows={3} maxLength={1000} placeholder="What went wrong? (optional)" onChange={(e) => (reason = e.target.value)} />
        </div>
      ),
      okText: "Refund me",
      onOk: () =>
        run("refund", async () => {
          const out = await themeAction("refund", { reason: reason || undefined });
          message.success(out.status === "refunded" ? "Refunded. It's on its way back to you." : "Your refund is going through.");
          await load();
        }),
    });
  };

  // A developer's own listing on their own store: before or during review.
  const testIt = () =>
    run("test", async () => {
      if (theme) {
        const out = await apiFetch(`/api/market/store/themes/${encodeURIComponent(slug)}/test`, { method: "POST", body: {} });
        message.success(`Version ${out.version} is on your store`);
        return router.push(`/theme-editor/${out.themeId}`);
      }
      await apiFetch(`/api/market/store/apps/${encodeURIComponent(slug)}/test`, { method: "POST", body: {} });
      message.success(`${data.item.name} installed for testing`);
      return router.push("/admin/apps");
    });

  const installApp = () =>
    run("install", async () => {
      await apiFetch(`/api/apps/${encodeURIComponent(data.official ? slug : `mkt-${slug}`)}/install`, { method: "POST", body: { settings: {} } });
      message.success(`${data.item.name} installed`);
      router.push(data.official ? `/admin/apps/details/${slug}` : "/admin/apps");
    });

  if (error)
    return (
      <div>
        <PageHeader title="Oyklane Store" backHref="/admin/online-store/themes" />
        <Alert type="error" showIcon message={error} action={<a href={MARKET}>Browse the Oyklane Store</a>} />
      </div>
    );
  if (!data) return <Skeleton active paragraph={{ rows: 6 }} />;

  if (data.testing)
    return (
      <div>
        <PageHeader title={data.item.name} subtitle="Your own listing, on your own store" backHref={theme ? "/admin/online-store/themes" : "/admin/apps"} />
        <Card className="max-w-xl">
          <p className="m-0 text-[14px]">
            {theme ? `Version ${data.version || "—"} is your newest upload.` : "Install it here with a real API key and real events."} This store uses your developer email, so you can test it before review. It's free and sellers don't see it.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {!theme && data.installed ? (
              <Button type="primary" onClick={() => router.push("/admin/apps")}>
                Installed — open Apps
              </Button>
            ) : (
              <Button type="primary" loading={busy === "test"} disabled={theme && !data.version} onClick={testIt}>
                {theme ? (data.installed ? "Update and open the customizer" : "Install and open the customizer") : "Install on this store"}
              </Button>
            )}
            {data.installed && theme && <Button onClick={() => router.push(`/theme-editor/${data.theme.id}`)}>Open the customizer</Button>}
          </div>
          {theme && !data.version && <p className="m-0 mt-3 text-[12.5px] text-ink-muted">Upload it first: oyklane push</p>}
        </Card>
      </div>
    );

  const { item, price, license, refund } = data;
  const paid = !item.free && !data.official;
  const refundPending = ["requested", "processing"].includes(refund?.status);
  const canRenew = paid && license?.renewable;
  return (
    <div>
      <PageHeader title={item.name} subtitle={item.tagline} backHref={theme ? "/admin/online-store/themes" : "/admin/apps"} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6 min-w-0">
          {item.screenshots?.[0] && (
            <Card styles={{ body: { padding: 0 } }} className="overflow-hidden">
              <img src={item.screenshots[0]} alt="" className="w-full aspect-[16/10] object-cover object-top" />
            </Card>
          )}
          {item.description && (
            <Card size="small" title="About">
              <p className="m-0 whitespace-pre-line text-[14px] text-ink-muted">{item.description}</p>
            </Card>
          )}
          {!theme && item.scopeLabels?.length > 0 && (
            <Card size="small" title="It will be able to">
              <ul className="m-0 pl-5 text-[14px] text-ink-muted">
                {item.scopeLabels.map((s) => (
                  <li key={s}>{s}</li>
                ))}
                {item.embeds && <li>Add a script to your store's pages (not checkout)</li>}
              </ul>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <Store size={15} className="text-ink-muted" aria-hidden="true" />
              <span className="text-[12.5px] text-ink-muted">Oyklane Store · {data.official ? "by Oyklane" : `by ${item.by?.name || "a developer"}`}</span>
            </div>
            {done ? (
              <>
                <Alert type="success" showIcon message={`${item.name} is in your themes`} description="Customise it, preview it on your store, and publish when you're ready." className="mb-3" />
                <div className="flex flex-wrap gap-2">
                  <Button type="primary" onClick={() => router.push(`/theme-editor/${done.themeId}`)}>
                    Customize
                  </Button>
                  <Button onClick={() => router.push("/admin/online-store/themes")}>Go to Themes</Button>
                </div>
              </>
            ) : (
              <>
                <p className="m-0 text-[26px] font-semibold tabular-nums">{item.free || data.official ? "Free" : inr(price?.amount)}</p>
                {paid && (
                  <p className="m-0 mt-1 text-[12.5px] text-ink-muted">
                    {price.monthly ? "a month, billed with your plan" : "a year, for this store"} · + {price.rate}% GST ({inr(price.gst)}) = <b>{inr(price.total)}</b>
                  </p>
                )}
                <div className="flex flex-col gap-2 mt-4">
                  {theme ? (
                    data.installed && data.official ? (
                      <Button block onClick={() => router.push("/admin/online-store/themes")}>
                        Already in your themes — open Themes
                      </Button>
                    ) : paid && !data.owned ? (
                      <Button type="primary" size="large" block loading={busy === "buy"} disabled={data.payments === "unconfigured"} onClick={buy}>
                        {license ? "Renew" : "Buy"} for {inr(price.total)}
                      </Button>
                    ) : data.installed && !data.official ? (
                      <>
                        {data.update ? (
                          <Button type="primary" size="large" block loading={busy === "update"} onClick={update}>
                            Update to version {data.update.to}
                          </Button>
                        ) : (
                          <Button block onClick={() => router.push("/admin/online-store/themes")}>
                            Installed — open Themes
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        {paid && (
                          <label className="block text-[12.5px] text-ink-muted">
                            Purchase code
                            <Input className="mt-1 font-mono" value={purchaseCode} onChange={(e) => setTypedCode(e.target.value)} placeholder="OYK-XXXX-XXXX-XXXX-XXXX" disabled={refundPending} />
                          </label>
                        )}
                        <Button type="primary" size="large" block loading={busy === "install"} disabled={refundPending || (paid && !purchaseCode.trim())} onClick={installTheme}>
                          Add to my themes
                        </Button>
                      </>
                    )
                  ) : data.installed ? (
                    <Button block onClick={() => router.push("/admin/apps")}>
                      Installed — open Apps
                    </Button>
                  ) : (
                    <Button type="primary" size="large" block loading={busy === "install"} onClick={installApp}>
                      {paid ? `Install — ${inr(price.amount)}/month` : "Install"}
                    </Button>
                  )}
                  {theme && data.installed && !data.official && (
                    <Button block danger loading={busy === "uninstall"} onClick={uninstall}>
                      Uninstall
                    </Button>
                  )}
                  {theme && data.preview && (
                    <a href={`${MARKET}/themes/${encodeURIComponent(slug)}/preview`} target="_blank" rel="noopener noreferrer">
                      <Button block icon={<ExternalLink size={14} aria-hidden="true" />}>
                        Preview every page
                      </Button>
                    </a>
                  )}
                </div>
                {theme && data.owned && paid && !license?.expired && <Tag color="green" className="mt-3">Bought — this store's licence</Tag>}
                {data.update && license?.expired && <p className="m-0 mt-3 text-[12.5px] text-ink-muted">Version {data.update.to} is out. Renew to get it.</p>}
                {data.payments === "unconfigured" && paid && !data.owned && <p className="m-0 mt-3 text-[12.5px] text-[#B45309]">Payments aren't available right now — try again later.</p>}
              </>
            )}
          </Card>
          {license && !done && (
            <Card size="small" title="Your licence">
              <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">
                <dt className="text-ink-muted">Purchase code</dt>
                <dd className="m-0 font-mono break-all">{license.code || "Ask your store owner"}</dd>
                <dt className="text-ink-muted">Seller</dt>
                <dd className="m-0 break-all">{license.seller}</dd>
                <dt className="text-ink-muted">Domain</dt>
                <dd className="m-0 break-all">{license.domain}</dd>
                {license.expiresAt && (
                  <>
                    <dt className="text-ink-muted">{license.expired ? "Ended" : "Valid until"}</dt>
                    <dd className="m-0">{day(license.expiresAt)}</dd>
                  </>
                )}
              </dl>
              {license.expired && <p className="m-0 mt-2 text-[12.5px] text-ink-muted">Your live theme keeps working. Renew to install it again or get updates.</p>}
              {canRenew && data.owned && (
                <Button block className="mt-3" loading={busy === "buy"} disabled={data.payments === "unconfigured"} onClick={buy}>
                  Renew for {inr(price.total)}
                </Button>
              )}
            </Card>
          )}
          {refund && !done && (refund.status || refund.eligible) && (
            <Card size="small" title="Refund">
              {refundPending && <p className="m-0 text-[13px]">Your refund is going through. The theme can't be installed until it's done.</p>}
              {refund.status === "failed" && <p className="m-0 text-[13px]">The refund didn't go through. Our team is looking into it.</p>}
              {refund.eligible && (
                <>
                  <p className="m-0 text-[13px] text-ink-muted">You can get your money back until {day(refund.deadline)}, straight away. {data.installed ? "Uninstall the theme first." : "After that, the payment can't be refunded."}</p>
                  {!data.installed && (
                    <Button block className="mt-3" loading={busy === "refund"} onClick={applyForRefund}>
                      Refund this theme
                    </Button>
                  )}
                </>
              )}
            </Card>
          )}
          {paid && theme && (
            <Card size="small">
              <p className="m-0 text-[12.5px] text-ink-muted flex gap-2">
                <ShieldCheck size={15} className="shrink-0 mt-0.5 text-[#047857]" aria-hidden="true" />
                Paid through Oyklane. One payment covers a year on this store, with updates when you choose them, and a refund up to 7 days after you first install it. The theme's code is locked, and you customise it in the editor like any theme.
              </p>
            </Card>
          )}
          <Link href={MARKET} className="text-[13px] text-ink-muted" target="_blank">
            Browse more on the Oyklane Store ↗
          </Link>
        </div>
      </div>
    </div>
  );
}
