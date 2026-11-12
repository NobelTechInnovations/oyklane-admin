"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Progress, Skeleton } from "antd";
import { HardDrive } from "lucide-react";
import { apiFetch } from "@/lib/api";

/** Media storage on the store's plan: how much is used and how much is left.
 *  `refreshKey` changes (e.g. after an upload or delete) fetch it again. */
export function StorageMeter({ refreshKey = 0, className = "" }) {
  const [u, setU] = useState(null);
  useEffect(() => {
    apiFetch("/api/files/usage")
      .then((d) => setU(d.usage))
      .catch(() => setU(false));
  }, [refreshKey]);
  if (u === false) return null;
  if (!u) return <Skeleton.Input active block className={className} style={{ height: 76 }} />;
  const tone = u.percent >= 95 ? "exception" : u.percent >= 80 ? "active" : "normal";
  const color = u.percent >= 95 ? "#DC2626" : u.percent >= 80 ? "#D97706" : "#18181B";
  return (
    <div className={`rounded-[14px] border border-app-border bg-app-surface px-5 py-4 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="m-0 flex items-center gap-2 text-[14px] font-semibold text-ink">
          <HardDrive size={15} className="text-ink-muted" aria-hidden="true" />
          Media storage
        </p>
        <p className="m-0 text-[13px] text-ink-muted tabular-nums">
          <b className="font-semibold text-ink">{u.label.used}</b> of {u.label.limit} used · {u.label.left} left
        </p>
      </div>
      <Progress percent={u.percent} showInfo={false} status={tone} strokeColor={color} className="!mb-0 !mt-2" aria-label={`${u.percent}% of media storage used`} />
      <p className="m-0 mt-1 text-[12.5px] text-ink-muted">
        {u.files.count} file{u.files.count === 1 ? "" : "s"}
        {u.videos.count ? ` and ${u.videos.count} video${u.videos.count === 1 ? "" : "s"}` : ""} on the {u.plan} plan. Photos are made smaller when you upload them, without a visible change.
        {u.percent >= 80 && (
          <>
            {" "}
            <Link href="/admin/settings/billing" className="font-medium">
              Get more space
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
