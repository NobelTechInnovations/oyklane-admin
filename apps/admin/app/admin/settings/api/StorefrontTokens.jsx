"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, Input, Modal, Table, Typography } from "antd";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";

const API = (process.env.NEXT_PUBLIC_API_URL || "https://api.oyklane.com").replace(/\/+$/, "");

/** Storefront API tokens: public, for the store's own website or app (API modules/storefront-api). */
export function StorefrontTokens({ canEdit }) {
  const { message, modal } = App.useApp();
  const [tokens, setTokens] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    apiFetch("/api/developer/storefront-tokens").then((d) => setTokens(d.tokens)).catch(() => setTokens([]));
  }, []);
  async function save() {
    setBusy(true);
    try {
      const body = { name: edit.name, origins: edit.origins };
      const d = edit.id ? await apiFetch(`/api/developer/storefront-tokens/${edit.id}`, { method: "PATCH", body }) : await apiFetch("/api/developer/storefront-tokens", { method: "POST", body });
      setTokens((list) => (edit.id ? list.map((t) => (t.id === d.token.id ? d.token : t)) : [d.token, ...list]));
      setEdit(null);
      message.success(edit.id ? "Saved" : "Token made. Copy it into your website.");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  function revoke(t) {
    modal.confirm({
      title: `Remove "${t.name}"?`,
      content: "Websites using it stop working until they get a new token.",
      okText: "Remove",
      okButtonProps: { danger: true },
      onOk: async () => {
        await apiFetch(`/api/developer/storefront-tokens/${t.id}`, { method: "DELETE" });
        setTokens((list) => list.filter((x) => x.id !== t.id));
      },
    });
  }
  const sample = tokens?.[0]?.token || "oyst_…";
  return (
    <Card
      size="small"
      title="Storefront API"
      className="mb-6"
      extra={
        canEdit && (
          <Button size="small" icon={<Plus size={13} />} onClick={() => setEdit({ name: "", origins: "" })}>
            New token
          </Button>
        )
      }
    >
      <p className="m-0 mb-3 text-[13px] text-ink-muted">Build your own website or app on your store: products, collections and carts that check out on your Oyklane checkout. These tokens are safe to put in a web page; they can't see orders or customers.</p>
      <Table
        rowKey="id"
        size="small"
        loading={!tokens}
        dataSource={tokens || []}
        pagination={false}
        locale={{ emptyText: "No Storefront API tokens yet" }}
        columns={[
          { title: "Name", dataIndex: "name", width: 160 },
          { title: "Token", dataIndex: "token", render: (v) => <Typography.Text code copyable={{ text: v }} className="text-[12px]">{`${v.slice(0, 12)}…`}</Typography.Text> },
          { title: "Websites allowed", dataIndex: "origins", render: (o) => (o?.length ? o.join(", ") : "Any") },
          { title: "Last used", dataIndex: "lastUsedAt", width: 120, render: (d) => (d ? new Date(d).toLocaleDateString([], { day: "numeric", month: "short" }) : "—") },
          {
            title: "",
            width: 130,
            align: "right",
            render: (_, t) =>
              canEdit && (
                <span className="inline-flex gap-1">
                  <Button size="small" type="text" onClick={() => setEdit({ id: t.id, name: t.name, origins: (t.origins || []).join(", ") })}>
                    Edit
                  </Button>
                  <Button size="small" type="text" danger onClick={() => revoke(t)}>
                    Remove
                  </Button>
                </span>
              ),
          },
        ]}
      />
      <details className="mt-3 text-[13px]">
        <summary className="cursor-pointer text-ink">How to use it</summary>
        <pre className="mt-2 overflow-x-auto rounded-md bg-app-bg p-3 text-[12px] leading-relaxed">{`<script src="${API}/sdk/storefront.js"></script>
<script>
  const shop = OyklaneStorefront({ token: "${sample}" });
  const { products } = await shop.products({ q: "tea", limit: 12 });
  const { cart } = await shop.cart.create([{ variant_id: products[0].variants[0].id, quantity: 1 }]);
  location.href = cart.checkout_url; // your Oyklane checkout
</script>

REST: ${API}/api/storefront-api/v1/products
Header: X-Oyklane-Storefront-Token: ${sample}
GET /shop · /products?q=&collection=&page=&limit= · /products/:handle · /collections
POST /carts {lines:[{variant_id,quantity}]} · GET /carts/:id
POST /carts/:id/lines · PATCH /carts/:id/lines {variant_id,quantity} · POST /carts/:id/discount {code}`}</pre>
      </details>
      <Modal open={Boolean(edit)} title={edit?.id ? "Edit token" : "New Storefront API token"} okText={edit?.id ? "Save" : "Make token"} okButtonProps={{ loading: busy }} onCancel={() => setEdit(null)} onOk={save}>
        {edit && (
          <div className="flex flex-col gap-3">
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Name</span>
              <Input value={edit.name} maxLength={80} placeholder="e.g. My Next.js website" onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </label>
            <label>
              <span className="mb-1 block text-[12px] text-ink-muted">Websites allowed to use it from a browser (optional)</span>
              <Input.TextArea rows={2} value={edit.origins} placeholder="https://www.example.com, https://shop.example.com" onChange={(e) => setEdit({ ...edit, origins: e.target.value })} />
              <span className="mt-0.5 block text-[12px] text-ink-subtle">Empty means any website. Apps and servers aren&apos;t limited by this.</span>
            </label>
          </div>
        )}
      </Modal>
    </Card>
  );
}
