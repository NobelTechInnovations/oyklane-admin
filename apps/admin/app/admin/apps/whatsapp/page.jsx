"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Drawer, Skeleton, Tabs } from "antd";
import { MessagesSquare, FileText, Megaphone, Zap, Settings, CheckCircle2, Clock } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { MetaConnectPanel } from "@/components/MetaConnectPanel";
import { HealthCard } from "./wa-ui";
import Inbox from "./Inbox";
import Templates from "./Templates";
import Broadcasts from "./Broadcasts";
import Automations from "./Automations";
import WaSettings from "./WaSettings";

const TABS = ["inbox", "templates", "broadcasts", "automations", "settings"];

/** `shared`: the store has no number of its own and sends from Oyklane's
 * (order updates and sign-in codes) — its inbox, Oyklane's templates
 * (read-only) and settings; broadcasts and automations need its own. */
function Suite({ shared = false }) {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState(TABS.includes(params.get("tab")) ? params.get("tab") : "inbox");
  const [role, setRole] = useState(null);
  useEffect(() => {
    apiFetch("/api/store")
      .then((d) => setRole(d.role))
      .catch(() => setRole("staff"));
  }, []);
  const canEdit = role && role !== "staff";
  const label = (Icon, text) => (
    <span className="inline-flex items-center gap-1.5">
      <Icon size={14} aria-hidden="true" />
      {text}
    </span>
  );
  return (
    <div className="flex flex-col gap-3">
      {!shared && <HealthCard compact />}
      <Tabs
        activeKey={shared && ["broadcasts", "automations"].includes(tab) ? "inbox" : tab}
        onChange={(k) => {
          setTab(k);
          router.replace(`/admin/apps/whatsapp?tab=${k}`, { scroll: false });
        }}
        items={[
          { key: "inbox", label: label(MessagesSquare, "Inbox"), children: <Inbox /> },
          { key: "templates", label: label(FileText, "Templates"), children: <Templates canEdit={canEdit} /> },
          !shared && { key: "broadcasts", label: label(Megaphone, "Broadcasts"), children: <Broadcasts canEdit={canEdit} /> },
          !shared && { key: "automations", label: label(Zap, "Automations"), children: <Automations /> },
          { key: "settings", label: label(Settings, "Settings"), children: <WaSettings canEdit={canEdit} /> },
        ].filter(Boolean)}
        destroyOnHidden
      />
    </div>
  );
}

const inr = (n) => `₹${Number(n || 0).toFixed(2)}`;

/** Sending from Oyklane's default number: one compact line — the number,
 * what each message type costs, and a way to switch to your own. */
function SharedBar({ platform, onOwn }) {
  const [rates, setRates] = useState(null);
  useEffect(() => {
    apiFetch("/api/whatsapp/rates")
      .then(setRates)
      .catch(() => {});
  }, []);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-app-border bg-app-surface px-4 py-2.5 shadow-card">
      <span className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink">
        {platform?.ready ? <CheckCircle2 size={15} className="text-status-success" aria-hidden="true" /> : <Clock size={15} className="text-ink-muted" aria-hidden="true" />}
        {platform?.ready ? `Sending from Oyklane's WhatsApp number${platform.number ? ` ${platform.number}` : ""}` : "Oyklane's WhatsApp number is being set up"}
      </span>
      {rates && (
        <span className="text-[12.5px] text-ink-muted">
          Per delivered message: updates {inr(rates.utility)} · offers {inr(rates.marketing)} · replies within 24 hours free
        </span>
      )}
      <Button size="small" className="ml-auto" onClick={onOwn}>
        Use your own number
      </Button>
    </div>
  );
}

export default function WhatsappPage() {
  const [mode, setMode] = useState(null);
  const [ownOpen, setOwnOpen] = useState(false);
  const loadMode = useCallback(() => {
    apiFetch("/api/whatsapp/mode")
      .then(setMode)
      .catch(() => setMode({ own: true }));
  }, []);
  useEffect(() => {
    loadMode();
  }, [loadMode]);

  return (
    <div>
      <PageHeader
        title="WhatsApp"
        subtitle="Conversations, templates, broadcasts and automatic messages."
        actions={
          <>
            <Link href="/admin/customers"><Button>Customers</Button></Link>
            <Link href="/admin/apps/meta-ads"><Button>Meta Ads</Button></Link>
          </>
        }
      />
      {!mode ? (
        <Skeleton active />
      ) : mode.own ? (
        <MetaConnectPanel focus="whatsapp" onChange={loadMode}>
          <Suspense fallback={null}>
            <Suite />
          </Suspense>
        </MetaConnectPanel>
      ) : (
        <div className="flex flex-col gap-3">
          <SharedBar platform={mode.platform} onOwn={() => setOwnOpen(true)} />
          <Drawer open={ownOpen} onClose={() => setOwnOpen(false)} width={620} title="Use your own WhatsApp number" destroyOnHidden>
            <MetaConnectPanel
              focus="whatsapp"
              onChange={() => {
                loadMode();
              }}
            />
          </Drawer>
          <Suspense fallback={null}>
            <Suite shared />
          </Suspense>
        </div>
      )}
    </div>
  );
}
