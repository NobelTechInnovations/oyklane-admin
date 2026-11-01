"use client";

import { useEffect, useState } from "react";
import { App, Alert, Button, Card, Form, Skeleton } from "antd";
import { Copy, ExternalLink } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { useApps } from "@/lib/apps";
import { useAppActions } from "@/components/apps/useAppActions";
import { AppNotInstalled } from "@/components/apps/AppPanelParts";
import { AppSettingsFields } from "@/components/apps/AppSettingsForm";

/** Apps ▸ XML Sitemap: the one link to give Google, what's in it, and
 * what to leave out. The sitemap itself updates as the store changes. */
export default function XmlSitemapPage() {
  const { message } = App.useApp();
  const { apps } = useApps();
  const { install, uninstall } = useAppActions();
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const app = (apps || []).find((a) => a.key === "xml-sitemap");

  const load = () =>
    apiFetch("/api/apps/xml-sitemap/status")
      .then(setStatus)
      .catch((err) => setStatus({ error: err.message }));
  useEffect(() => {
    if (app?.installed) load();
  }, [app?.installed]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (app) form.setFieldsValue({ images: "on", soldOut: "include", pages: "on", blog: "on", ...(app.settings || {}) });
  }, [app, form]);

  if (!apps) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (!app?.installed) return <AppNotInstalled appKey="xml-sitemap" title="XML Sitemap" description="One link that lists every product (with photos), collection, page and blog post — so Google and Bing find all of your store." />;

  async function save(values) {
    setSaving(true);
    if (await install(app, values)) load();
    setSaving(false);
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(status.url);
      message.success("Sitemap link copied");
    } catch {
      message.error("Couldn't copy — select the link and copy it.");
    }
  };
  const c = status?.counts;

  return (
    <div>
      <PageHeader title="XML Sitemap" backHref="/admin/apps" subtitle="Every page of your store in one file for search engines — it updates the moment you add or change something." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Card size="small" title="Your sitemap">
            {!status ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : status.error ? (
              <Alert type="error" showIcon message={status.error} />
            ) : (
              <>
                {status.locked && <Alert className="!mb-3" type="warning" showIcon message="Your store is password-protected, so search engines are kept out. Remove the password when you're ready to be found." />}
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2">
                  <code className="min-w-0 flex-1 truncate text-[13px] text-ink">{status.url}</code>
                  <Button size="small" icon={<Copy size={13} aria-hidden="true" />} onClick={copy}>
                    Copy
                  </Button>
                  <Button size="small" icon={<ExternalLink size={13} aria-hidden="true" />} href={status.url} target="_blank" rel="noopener noreferrer">
                    Open
                  </Button>
                </div>
                <dl className="m-0 mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    ["Products", c.products],
                    ["Photos", status.images ? c.images : "Off"],
                    ["Collections", c.collections],
                    ["Pages", c.pages],
                    ["Blog posts", c.articles],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-app-border px-3 py-2">
                      <dt className="text-[12px] text-ink-muted">{k}</dt>
                      <dd className="m-0 text-[17px] font-semibold tabular-nums text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </Card>
          <Card size="small" title="What goes in it">
            <Form form={form} layout="vertical" requiredMark={false} onFinish={save}>
              <AppSettingsFields app={app} form={form} />
              <div className="flex justify-end">
                <Button type="primary" htmlType="submit" loading={saving}>
                  Save
                </Button>
              </div>
            </Form>
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card size="small" title="Tell Google about it">
            <ol className="m-0 flex flex-col gap-2 pl-4 text-[13px] leading-relaxed text-ink">
              <li>
                Open{" "}
                <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
                  Google Search Console
                </a>{" "}
                and add your store&apos;s address as a property.
              </li>
              <li>Go to Sitemaps, paste the sitemap link and press Submit.</li>
              <li>
                For Bing, do the same in{" "}
                <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer">
                  Bing Webmaster Tools
                </a>
                .
              </li>
            </ol>
            <p className="m-0 mt-3 text-[12.5px] text-ink-muted">You only do this once. Your robots.txt already points search engines to the sitemap.</p>
          </Card>
          <Card size="small">
            <Button danger block onClick={() => uninstall(app)}>
              Uninstall XML Sitemap
            </Button>
            <p className="m-0 mt-2 text-[12px] text-ink-muted">Your store keeps a plain sitemap without photos.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
