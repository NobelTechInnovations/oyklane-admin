"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { App, Card, Select } from "antd";
import { Boxes } from "lucide-react";
import { apiFetch } from "@/lib/api";

/** Product page ▸ Shipping package: the box this product ships in (saved
 * as soon as it's picked), so orders get their weight and size by
 * themselves. Packages are set up in Settings ▸ Shipping. */
export function ProductPackageCard({ productId }) {
  const { message } = App.useApp();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!productId) return;
    apiFetch(`/api/shipping/packages/product/${productId}`)
      .then(setData)
      .catch(() => setData({ packages: [] }));
  }, [productId]);

  async function pick(packageId) {
    setBusy(true);
    try {
      await apiFetch(`/api/shipping/packages/product/${productId}`, { method: "PUT", body: { packageId: packageId || null } });
      setData((d) => ({ ...d, packageId: packageId || null }));
      message.success("Shipping package saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const def = data?.packages?.find((p) => p.id === data.defaultId);
  return (
    <Card size="small" title={<span className="inline-flex items-center gap-2"><Boxes size={15} aria-hidden="true" /> Shipping package</span>}>
      {!productId ? (
        <p className="m-0 text-[13px] text-ink-muted">Save the product first, then choose the box it ships in.</p>
      ) : data && !data.packages.length ? (
        <p className="m-0 text-[13px] text-ink-muted">
          No packages yet. <Link href="/admin/settings/shipping">Add your boxes</Link> in Settings ▸ Shipping.
        </p>
      ) : (
        <>
          <Select
            className="w-full"
            loading={!data || busy}
            value={data?.packageId || ""}
            onChange={pick}
            options={[{ value: "", label: def ? `Default — ${def.name}` : "Store default" }, ...(data?.packages || []).map((p) => ({ value: p.id, label: `${p.name} · ${p.lengthCm}×${p.widthCm}×${p.heightCm} cm · ${p.weightGrams} g` }))]}
          />
          <p className="m-0 mt-2 text-[12px] text-ink-muted">Orders with this product get its weight and box size when you ship them.</p>
        </>
      )}
    </Card>
  );
}
