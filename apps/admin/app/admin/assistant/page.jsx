"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { App, Button, Drawer, Input, Segmented, Skeleton, Tooltip } from "antd";
import { Sparkles, Plus, Send, MessageSquare, Trash2, PanelRight, Users, ShoppingCart, Gift, MessageCircle, Zap, BadgePercent, Crown } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ActionCard, AutopilotPanel, BuyerRow, EmptyList, ProductsCard, RulesPanel, SettingsCard, StagePill } from "./parts";

const PROMPTS = [
  [Users, "Which buyers are most interested in my products?"],
  [ShoppingCart, "Who has abandoned their cart?"],
  [BadgePercent, "Should I offer a discount to my hottest buyer?"],
  [Gift, "Suggest personal deals for my best buyers"],
  [MessageCircle, "Which products get interest but few sales?"],
  [Zap, "Enable autopilot for selected products"],
];
const MODE_LABEL = { recommend: "Recommend", approve: "Approve", autopilot: "Autopilot" };

function Avatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0067B8] to-[#2B9FE6] text-white shadow-[0_6px_16px_-8px_rgba(0,103,184,0.7)]">
      <Sparkles size={16} aria-hidden="true" />
    </span>
  );
}

function Cards({ cards, onAsk, onChanged }) {
  if (!cards?.length) return null;
  return (
    <div className="mt-3 flex flex-col gap-2.5">
      {cards.map((c, i) => {
        if (c.type === "buyers") return <div key={i} className="flex flex-col gap-2">{c.buyers.map((b) => <BuyerRow key={b.key} b={b} onAsk={onAsk} />)}</div>;
        if (c.type === "buyer")
          return (
            <div key={i} className="flex flex-col gap-2">
              <BuyerRow b={c.buyer} onAsk={onAsk} />
              {c.buyer.timeline?.length > 0 && (
                <div className="rounded-xl border border-app-border bg-app-surface p-3">
                  <p className="m-0 mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-muted">What they did</p>
                  <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[12.5px]">
                    {c.buyer.timeline.slice(0, 10).map((e, k) => (
                      <li key={k} className="flex justify-between gap-3">
                        <span className="text-ink">{{ view_product: "Viewed", search: "Searched", add_to_cart: "Added to cart", checkout_start: "Started checkout", purchase: "Bought" }[e.type]} {e.product || (e.query ? `“${e.query}”` : "")}</span>
                        <span className="shrink-0 text-ink-muted">{new Date(e.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        if (c.type === "action") return <ActionCard key={c.action.id} action={c.action} onChanged={onChanged} />;
        if (c.type === "products") return <ProductsCard key={i} products={c.products} />;
        if (c.type === "settings") return <SettingsCard key={i} card={c} onDone={onChanged} />;
        return null;
      })}
    </div>
  );
}

function Insights({ data, onAsk, reload, setSettings }) {
  const [tab, setTab] = useState("buyers");
  if (!data) return <Skeleton active className="p-4" />;
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-app-border px-4 pt-4 pb-3">
        <Segmented
          block
          value={tab}
          onChange={setTab}
          options={[
            { value: "buyers", label: "Buyers" },
            { value: "deals", label: `Approvals${data.pending.length ? ` ${data.pending.length}` : ""}` },
            { value: "rules", label: "Rules" },
            { value: "autopilot", label: "Autopilot" },
          ]}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "buyers" && (
          <div className="flex flex-col gap-2.5">
            <p className="m-0 text-[12px] text-ink-muted">Last 30 days on your store. Activity is what buyers did; likelihoods are estimates.</p>
            {data.buyers.length ? data.buyers.map((b) => <BuyerRow key={b.key} b={b} onAsk={onAsk} />) : <EmptyList text="Buyer activity shows up here as shoppers browse." />}
            {data.products.length > 0 && (
              <>
                <p className="m-0 mt-3 text-[12.5px] font-semibold text-ink">Product interest</p>
                <ProductsCard products={data.products} />
              </>
            )}
          </div>
        )}
        {tab === "deals" && (
          <div className="flex flex-col gap-2.5">
            <Button icon={<Sparkles size={14} />} onClick={() => apiFetch("/api/assistant/actions/recommend", { method: "POST" }).then(reload)}>
              Find new deals
            </Button>
            {data.pending.length ? data.pending.map((a) => <ActionCard key={a.id} action={a} onChanged={reload} />) : <EmptyList text="Nothing waiting for you." />}
            {data.recent.length > 0 && (
              <>
                <p className="m-0 mt-3 text-[12.5px] font-semibold text-ink">Activity log</p>
                {data.recent.map((a) => <ActionCard key={a.id} action={a} compact />)}
              </>
            )}
          </div>
        )}
        {tab === "rules" && <RulesPanel />}
        {tab === "autopilot" && <AutopilotPanel settings={data.settings} usage={data.usage} platform={data.platform} onSaved={setSettings} />}
      </div>
    </div>
  );
}

/** The AI Sales Assistant — a full-page workspace (Pro). */
export default function AssistantPage() {
  const { message } = App.useApp();
  const [overview, setOverview] = useState(null);
  const [locked, setLocked] = useState(false);
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [panel, setPanel] = useState(false);
  const scroller = useRef(null);

  const loadOverview = useCallback(() => {
    apiFetch("/api/assistant/overview")
      .then(setOverview)
      .catch((err) => (err.status === 403 ? setLocked(true) : message.error(err.message)));
  }, [message]);
  const loadChats = useCallback(() => apiFetch("/api/assistant/chats").then((d) => setChats(d.chats)).catch(() => {}), []);
  useEffect(() => {
    loadOverview();
    loadChats();
  }, [loadOverview, loadChats]);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function openChat(id) {
    setChatId(id);
    const { chat } = await apiFetch(`/api/assistant/chats/${id}`);
    setMessages(chat.messages);
  }

  async function ask(text) {
    const q = String(text || draft).trim();
    if (!q || thinking) return;
    setDraft("");
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content: q }]);
    setThinking(true);
    try {
      const res = await apiFetch("/api/assistant/ask", { method: "POST", body: { chatId, question: q } });
      setChatId(res.chatId);
      setMessages((m) => [...m, res.message]);
      loadChats();
      loadOverview();
    } catch (err) {
      setMessages((m) => [...m, { id: `err-${Date.now()}`, role: "assistant", content: err.message }]);
    } finally {
      setThinking(false);
    }
  }

  if (locked) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-6">
        <div className="max-w-lg rounded-3xl border border-app-border bg-app-surface p-8 text-center shadow-card">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0067B8] to-[#2B9FE6] text-white">
            <Crown size={22} />
          </span>
          <h1 className="m-0 text-[24px] font-semibold text-ink">AI Sales Assistant is part of Pro</h1>
          <p className="mt-2 text-[14px] text-ink-muted">See which buyers are about to buy, send them personal offers on WhatsApp, negotiate within your limits — or let autopilot do it.</p>
          <Link href="/admin/settings/billing">
            <Button type="primary" size="large">See Pro</Button>
          </Link>
        </div>
      </div>
    );
  }

  const mode = overview?.settings;
  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-[560px] bg-app-bg">
      {/* History */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-app-border bg-app-surface md:flex">
        <div className="p-3">
          <Button block type="primary" icon={<Plus size={15} />} onClick={() => (setChatId(null), setMessages([]))}>
            New chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {chats.map((c) => (
            <div key={c.id} className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] cursor-pointer ${c.id === chatId ? "bg-[#E5F1FB] text-[#005A9E]" : "text-ink hover:bg-app-bg"}`} onClick={() => openChat(c.id)}>
              <MessageSquare size={14} className="shrink-0 opacity-60" />
              <span className="flex-1 truncate">{c.title}</span>
              <button
                type="button"
                aria-label="Delete chat"
                className="hidden shrink-0 rounded p-0.5 text-ink-muted hover:text-[#B42318] group-hover:block"
                onClick={(e) => {
                  e.stopPropagation();
                  apiFetch(`/api/assistant/chats/${c.id}`, { method: "DELETE" }).then(() => {
                    if (c.id === chatId) (setChatId(null), setMessages([]));
                    loadChats();
                  });
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {!chats.length && <p className="px-2.5 text-[12px] text-ink-muted">Your chats appear here.</p>}
        </div>
        {mode && (
          <div className="border-t border-app-border p-3 text-[12px]">
            <span className="text-ink-muted">Mode</span>
            <p className="m-0 flex items-center gap-2 font-semibold text-ink">
              {mode.paused ? <span className="text-[#B42318]">Stopped</span> : MODE_LABEL[mode.mode]}
              {overview.pending.length > 0 && <span className="rounded-full bg-[#FFFAEB] px-2 py-0.5 text-[11px] text-[#B54708]">{overview.pending.length} to approve</span>}
            </p>
          </div>
        )}
      </aside>

      {/* Conversation */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-app-border bg-app-surface/80 px-4 py-2.5 backdrop-blur">
          <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <Avatar /> AI Sales Assistant
          </span>
          <Tooltip title="Buyers, approvals, rules, autopilot">
            <Button className="xl:!hidden" icon={<PanelRight size={16} />} onClick={() => setPanel(true)} />
          </Tooltip>
        </div>
        <div ref={scroller} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[780px] px-4 py-6">
            {empty ? (
              <div className="pt-[6vh] text-center">
                <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0067B8] to-[#2B9FE6] text-white shadow-[0_18px_40px_-18px_rgba(0,103,184,0.8)]">
                  <Sparkles size={26} />
                </span>
                <h1 className="m-0 text-[28px] font-semibold tracking-[-0.02em] text-ink">Your AI sales employee</h1>
                <p className="mx-auto mt-2 max-w-md text-[14.5px] text-ink-muted">It watches who&apos;s interested, suggests personal deals, negotiates within your limits and follows up on WhatsApp — with your approval, or on autopilot.</p>
                {overview && (
                  <div className="mx-auto mt-5 flex max-w-md flex-wrap justify-center gap-2 text-[12.5px]">
                    {["checkout", "cart", "considering"].map((st) => {
                      const n = overview.buyers.filter((b) => b.stage === st).length;
                      return (
                        <span key={st} className="inline-flex items-center gap-1.5 rounded-full border border-app-border bg-app-surface px-3 py-1">
                          <StagePill stage={st} /> <b className="text-ink">{n}</b>
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="mt-8 grid gap-2.5 text-left sm:grid-cols-2">
                  {PROMPTS.map(([Icon, p]) => (
                    <button key={p} type="button" onClick={() => ask(p)} className="flex items-start gap-3 rounded-2xl border border-app-border bg-app-surface px-4 py-3 text-[13.5px] text-ink transition hover:border-[#9FC9EE] hover:shadow-[0_8px_24px_-16px_rgba(0,103,184,0.6)]">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E5F1FB] text-[#0067B8]">
                        <Icon size={15} />
                      </span>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[#0078d4] px-4 py-2.5 text-[14px] text-white">{m.content}</div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex gap-3">
                      <Avatar />
                      <div className="min-w-0 flex-1">
                        <div className="whitespace-pre-wrap rounded-2xl rounded-tl-md border border-app-border bg-app-surface px-4 py-3 text-[14px] leading-relaxed text-ink">{m.content}</div>
                        <Cards cards={m.data?.cards} onAsk={ask} onChanged={loadOverview} />
                      </div>
                    </div>
                  )
                )}
                {thinking && (
                  <div className="flex gap-3">
                    <Avatar />
                    <div className="flex items-center gap-1.5 rounded-2xl border border-app-border bg-app-surface px-4 py-3">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-[#2B9FE6]" style={{ animationDelay: `${i * 120}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-app-border bg-app-surface px-4 py-3">
          <div className="mx-auto flex w-full max-w-[780px] items-end gap-2 rounded-2xl border border-app-border bg-white p-2 shadow-[0_8px_30px_-20px_rgba(15,42,74,0.45)] focus-within:border-[#0078d4]">
            <Input.TextArea
              variant="borderless"
              autoSize={{ minRows: 1, maxRows: 6 }}
              placeholder="Ask about buyers, deals, carts… e.g. “Create a deal for Priya”"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask();
                }
              }}
            />
            <Button type="primary" shape="circle" icon={<Send size={15} />} loading={thinking} disabled={!draft.trim()} onClick={() => ask()} aria-label="Send" />
          </div>
          <p className="mx-auto mt-1.5 max-w-[780px] text-center text-[11px] text-ink-muted">Uses only your store&apos;s data. Offers never go below your floors; sending always respects WhatsApp consent.</p>
        </div>
      </section>

      {/* Insights */}
      <aside className="hidden w-[380px] shrink-0 border-l border-app-border bg-app-surface xl:block">
        <Insights data={overview} onAsk={ask} reload={loadOverview} setSettings={(s) => setOverview((o) => ({ ...o, settings: s }))} />
      </aside>
      <Drawer open={panel} onClose={() => setPanel(false)} width={400} styles={{ body: { padding: 0 } }} title="Insights">
        <Insights data={overview} onAsk={(q) => (setPanel(false), ask(q))} reload={loadOverview} setSettings={(s) => setOverview((o) => ({ ...o, settings: s }))} />
      </Drawer>
    </div>
  );
}
