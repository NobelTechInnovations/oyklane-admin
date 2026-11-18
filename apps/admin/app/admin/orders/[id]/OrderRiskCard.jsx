"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Progress, Skeleton, Tag } from "antd";
import { apiFetch } from "@/lib/api";

const LEVEL = { high: ["red", "High risk", "#DC2626"], medium: ["gold", "Medium risk", "#D97706"], low: ["green", "Low risk", "#16A34A"] };
const OUTCOME = { delivered: "Delivered", rto: "Came back (RTO)", cancelled: "Cancelled before shipping", unknown: "Not known" };

/**
 * COD / RTO risk of this order (orders/risk.js): a score from 0 to 100 of
 * how likely it is to come back undelivered, and why.
 */
export function OrderRiskCard({ orderId, cod }) {
  const [risk, setRisk] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const load = (rescore) => {
    setBusy(Boolean(rescore));
    return apiFetch(`/api/orders/${orderId}/risk${rescore ? "?rescore=1" : ""}`)
      .then((d) => setRisk(d.risk))
      .catch(() => setRisk(null))
      .finally(() => setBusy(false));
  };
  useEffect(() => {
    load(false);
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (risk === null) return null;
  if (risk === undefined) {
    return (
      <Card size="small" title="Delivery risk">
        <Skeleton active title={false} paragraph={{ rows: 2 }} />
      </Card>
    );
  }
  const [color, label, stroke] = LEVEL[risk.level] || LEVEL.low;
  const up = (risk.reasons || []).filter((r) => r.impact > 0);
  const down = (risk.reasons || []).filter((r) => r.impact < 0);
  return (
    <Card
      size="small"
      title="Delivery risk"
      extra={
        <Tag color={color} className="!m-0">
          {risk.score} · {label}
        </Tag>
      }
    >
      <Progress percent={risk.score} showInfo={false} size="small" strokeColor={stroke} aria-label={`Risk score ${risk.score} out of 100`} />
      <p className="m-0 mt-1 text-[12px] text-ink-muted">How likely this order is to come back undelivered, out of 100.</p>
      {up.length > 0 && (
        <ul className="m-0 mt-3 flex list-none flex-col gap-1 p-0 text-[13px]">
          {up.map((r) => (
            <li key={r.key} className="flex gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-status-danger" aria-hidden="true" />
              {r.text}
            </li>
          ))}
          {down.map((r) => (
            <li key={r.key} className="flex gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-status-success" aria-hidden="true" />
              {r.text}
            </li>
          ))}
        </ul>
      )}
      {risk.level === "high" && cod && !risk.outcome && <Alert className="!mt-3" type="warning" showIcon message="Confirm with the customer by phone or WhatsApp before shipping, or ask them to pay online." />}
      {risk.outcome && <p className="m-0 mt-3 text-[13px]">Outcome: {OUTCOME[risk.outcome] || risk.outcome}</p>}
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="m-0 text-[11.5px] text-ink-subtle">{risk.model?.samples ? `Learns from ${Number(risk.model.samples).toLocaleString("en-IN")} delivered and returned orders across Oyklane.` : "Learns from delivered and returned orders across Oyklane."}</p>
        <Button size="small" type="link" className="!px-0" loading={busy} onClick={() => load(true)}>
          Score again
        </Button>
      </div>
    </Card>
  );
}
