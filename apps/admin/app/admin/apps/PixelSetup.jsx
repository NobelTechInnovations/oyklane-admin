"use client";

import { useEffect, useState } from "react";
import { Form, Input, Radio, Skeleton, Alert, Button } from "antd";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { SignInButton, AccountLine } from "@/components/accounts/AccountConnect";

const EVENTS = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase", "Search"];

/**
 * The Facebook Pixel install form: pick one of the pixels on the store's
 * Facebook login (Settings ▸ Connected accounts — the one login every Meta
 * app shares; "Continue with Facebook" here if it isn't there yet), or type
 * the Pixel ID. Fills the form's `pixelId` field either way. Once a pixel
 * is saved, the choices fold away behind "Change pixel", so no one swaps it
 * by a stray click.
 */
export function PixelSetup({ form, savedId = null }) {
  const [info, setInfo] = useState(null);
  const [pixels, setPixels] = useState(null);
  const [error, setError] = useState(null);
  const pixelId = Form.useWatch("pixelId", form);
  // The pixel already saved: shown on its own until "Change pixel".
  const [changing, setChanging] = useState(!savedId);
  const savedPixel = pixels?.find((p) => p.id === savedId);
  const lastSeen = (p) => (p.lastFired ? `last active ${new Date(p.lastFired).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "no activity yet");

  useEffect(() => {
    apiFetch("/api/apps/facebook-pixel/connect")
      .then((d) => {
        setInfo(d);
        if (d.connectedAs) {
          apiFetch("/api/apps/facebook-pixel/pixels")
            .then((r) => setPixels(r.pixels))
            .catch((err) => setError(err.message));
        }
      })
      .catch(() => setInfo({ configured: false }));
  }, []);

  if (savedId && !changing) {
    return (
      <div className="flex flex-col gap-4">
        {info?.connectedAs && <AccountLine kind="facebook" account={info.account} />}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#B7E4C7] bg-[#F3FBF6] px-4 py-3">
          <CheckCircle2 size={20} className="shrink-0 text-status-success" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[13.5px] font-semibold text-ink">{savedPixel?.name || "Pixel connected"}</p>
            <p className="m-0 text-xs text-ink-muted">
              {savedId}
              {savedPixel ? ` · ${savedPixel.adAccount} · ${lastSeen(savedPixel)}` : ""}
            </p>
          </div>
          <Button size="small" icon={<ChevronDown size={14} aria-hidden="true" />} iconPosition="end" onClick={() => setChanging(true)}>
            Change pixel
          </Button>
        </div>
        <Form.Item name="pixelId" hidden>
          <Input />
        </Form.Item>
        <div className="rounded-lg bg-app-bg px-3 py-2.5">
          <p className="m-0 text-xs font-medium text-ink">Tracked on every page, checkout included</p>
          <p className="m-0 mt-1 text-xs text-ink-muted">{EVENTS.join(" · ")} — with product ids and order value, so Meta can optimise your ads for sales.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {savedId && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2">
          <p className="m-0 text-[13px] text-ink">Changing the pixel moves your store's tracking to the one you pick — after you save.</p>
          <Button size="small" type="link" className="!px-0" onClick={() => { form.setFieldValue("pixelId", savedId); setChanging(false); }}>
            Keep current pixel
          </Button>
        </div>
      )}
      {!info ? (
        <Skeleton active paragraph={{ rows: 1 }} title={false} />
      ) : info.configured ? (
        info.connectedAs ? (
          <div className="flex flex-col gap-2">
            <AccountLine kind="facebook" account={info.account} />
            {error && <Alert type="warning" showIcon message={error} />}
            {pixels === null && !error && <Skeleton active paragraph={{ rows: 2 }} title={false} />}
            {pixels?.length === 0 && (
              <Alert type="info" showIcon message="No pixels found on your ad accounts" description="Create one in Meta Events Manager (Connect data sources ▸ Web), then come back — or type its ID below." />
            )}
            {pixels?.length > 0 && changing && (
              <Radio.Group value={pixelId} onChange={(e) => form.setFieldValue("pixelId", e.target.value)} style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                {pixels.map((p) => (
                  <Radio
                    key={p.id}
                    value={p.id}
                    style={{ display: "flex", alignItems: "flex-start", margin: 0, width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${pixelId === p.id ? "#0078d4" : "#E5E7EB"}`, background: pixelId === p.id ? "#F0F7FD" : "#fff" }}
                  >
                    <span className="block text-[13.5px] font-medium text-ink">{p.name}</span>
                    <span className="block text-xs text-ink-muted">
                      {p.id} · {p.adAccount} · {lastSeen(p)}
                    </span>
                  </Radio>
                ))}
              </Radio.Group>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <SignInButton kind="facebook" returnTo="/admin/apps/details/facebook-pixel" className="self-start" />
            <p className="m-0 text-xs text-ink-muted">Pick your pixel from a list — no ids to copy. One Facebook sign-in for your store, shared by every Meta app.</p>
          </div>
        )
      ) : null}

      <Form.Item
        name="pixelId"
        label={info?.configured ? "Or enter the Pixel ID" : "Pixel ID"}
        extra="In Meta Events Manager: Data sources ▸ your pixel ▸ Settings. It's a 15–16 digit number."
        rules={[
          { required: true, message: "Choose a pixel or enter its ID" },
          { pattern: /^\d{6,20}$/, message: "Pixel IDs are numbers only" },
        ]}
        className="!mb-0"
      >
        <Input placeholder="123456789012345" inputMode="numeric" />
      </Form.Item>

      <div className="rounded-lg bg-app-bg px-3 py-2.5">
        <p className="m-0 text-xs font-medium text-ink">Tracked on every page, checkout included</p>
        <p className="m-0 mt-1 text-xs text-ink-muted">{EVENTS.join(" · ")} — with product ids and order value, so Meta can optimise your ads for sales.</p>
      </div>
    </div>
  );
}
