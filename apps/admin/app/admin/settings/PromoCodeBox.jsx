"use client";

import { useState } from "react";
import { App, Button, Card, Input, Modal, Select } from "antd";
import { TicketPercent } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatDay } from "@/lib/billing";

/** Plan & billing ▸ promo code: check a code from Oyklane, see exactly
 * what it gives, then apply it. */
export function PromoCodeBox({ active, canManage, onApplied }) {
  const { message } = App.useApp();
  const [code, setCode] = useState("");
  const [offer, setOffer] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [busy, setBusy] = useState(null);

  async function check(nextPlanId) {
    setBusy("check");
    try {
      const { promo } = await apiFetch("/api/billing/promo/check", { method: "POST", body: { code, planId: nextPlanId || undefined } });
      setOffer(promo);
      setPlanId(promo.plan.id);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function apply() {
    setBusy("apply");
    try {
      await apiFetch("/api/billing/promo/redeem", { method: "POST", body: { code, planId } });
      message.success("Promo code applied");
      setOffer(null);
      setCode("");
      onApplied?.();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card size="small" title={<span className="inline-flex items-center gap-2"><TicketPercent size={15} aria-hidden="true" /> Promo code</span>} styles={{ body: { padding: 20 } }}>
      {active ? (
        <p className="m-0 text-[13px] text-ink">
          <strong className="font-mono">{active.code}</strong> is active until {formatDay(active.until)}. {active.summary}
        </p>
      ) : (
        <>
          <p className="m-0 mb-3 text-[13px] text-ink-muted">Got a code from Oyklane? Enter it to see what it gives you before applying it.</p>
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PRO50" maxLength={32} className="font-mono" onPressEnter={() => code.trim().length >= 3 && check()} disabled={!canManage} />
            <Button onClick={() => check()} loading={busy === "check"} disabled={!canManage || code.trim().length < 3}>
              Check
            </Button>
          </div>
          {!canManage && <p className="m-0 mt-2 text-[12px] text-ink-muted">Only the store owner or an admin can apply a code.</p>}
        </>
      )}
      <Modal open={Boolean(offer)} onCancel={() => setOffer(null)} title={`Promo code ${offer?.code || ""}`} okText="Apply code" onOk={apply} confirmLoading={busy === "apply"} destroyOnClose>
        {offer && (
          <>
            {offer.plans.length > 1 && (
              <div className="mb-3">
                <p className="m-0 mb-1 text-[13px] text-ink-muted">Plan</p>
                <Select value={planId} onChange={(v) => check(v)} options={offer.plans.map((p) => ({ label: p.name, value: p.id }))} className="w-full" loading={busy === "check"} />
              </div>
            )}
            <p className="m-0 text-[14px] text-ink">{offer.summary}</p>
            <p className="m-0 mt-2 text-[12.5px] text-ink-muted">Prices are before GST. You pay the rest through your usual billing; the code can't be removed once applied.</p>
          </>
        )}
      </Modal>
    </Card>
  );
}
