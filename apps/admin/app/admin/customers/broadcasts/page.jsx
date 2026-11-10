"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, Alert, Button, Skeleton } from "antd";
import { Mail, MessageSquareText, MessageCircle } from "lucide-react";
import { PageHeader } from "@shopcycle/ui";
import { apiFetch } from "@/lib/api";
import { useApps } from "@/lib/apps";
import WhatsappBroadcasts from "@/app/admin/apps/whatsapp/Broadcasts";
import ChannelBroadcasts from "./ChannelBroadcasts";

const TABS = ["whatsapp", "email", "sms"];

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState(TABS.includes(params.get("tab")) ? params.get("tab") : "whatsapp");
  const [meta, setMeta] = useState(null);
  const [role, setRole] = useState(null);
  const [error, setError] = useState(null);
  const { apps } = useApps();
  const wa = (apps || []).find((a) => a.key === "whatsapp");

  useEffect(() => {
    apiFetch("/api/broadcasts/meta")
      .then(setMeta)
      .catch((err) => setError(err));
    apiFetch("/api/store")
      .then((s) => setRole(s.role))
      .catch(() => setRole("owner"));
  }, []);

  if (error) {
    const plan = error.status === 402 || error.status === 403;
    return (
      <Alert
        type="info"
        showIcon
        message={plan ? "Broadcasts come with the Growth and Pro plans" : "Couldn't open broadcasts"}
        description={plan ? "Send offers and news to your customers by WhatsApp, email and SMS." : error.message}
        action={plan ? <Link href="/admin/settings/billing"><Button type="primary">See plans</Button></Link> : null}
      />
    );
  }
  if (!meta || !role) return <Skeleton active paragraph={{ rows: 6 }} />;
  const canEdit = role !== "staff";
  const label = (Icon, text) => (
    <span className="inline-flex items-center gap-1.5">
      <Icon size={14} aria-hidden="true" />
      {text}
    </span>
  );

  return (
    <Tabs
      activeKey={tab}
      onChange={(k) => {
        setTab(k);
        router.replace(`/admin/customers/broadcasts?tab=${k}`, { scroll: false });
      }}
      destroyOnHidden
      items={[
        {
          key: "whatsapp",
          label: label(MessageCircle, "WhatsApp"),
          children: wa?.installed ? (
            <WhatsappBroadcasts canEdit={canEdit} />
          ) : (
            <Alert
              type="info"
              showIcon
              message="Turn on the WhatsApp app to broadcast on WhatsApp"
              description="Send from your own WhatsApp number, or Oyklane's. Then pick a template, fill it in and choose who gets it."
              action={<Link href="/admin/apps/details/whatsapp"><Button type="primary">Open WhatsApp app</Button></Link>}
            />
          ),
        },
        { key: "email", label: label(Mail, "Email"), children: <ChannelBroadcasts channel="email" canEdit={canEdit} meta={meta} /> },
        { key: "sms", label: label(MessageSquareText, "SMS"), children: <ChannelBroadcasts channel="sms" canEdit={canEdit} meta={meta} /> },
      ]}
    />
  );
}

/** Customers ▸ Broadcasts: one message to many customers — WhatsApp,
 * email or SMS — to everyone who agreed, a segment, or people you pick. */
export default function BroadcastsPage() {
  return (
    <div>
      <PageHeader title="Broadcasts" />
      <Suspense fallback={<Skeleton active />}>
        <Inner />
      </Suspense>
    </div>
  );
}
