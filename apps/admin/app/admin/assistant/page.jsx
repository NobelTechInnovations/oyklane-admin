"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { App, Button, Drawer, Input, Skeleton, Tabs, Tooltip } from "antd";
import { Plus, ArrowUp, Trash2, PanelRight, Users, ShoppingCart, Gift, MessageCircle, Zap, BadgePercent, Crown, CreditCard, Eye, ClipboardCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import SiyaaMark from "@/components/SiyaaMark";
import { ActionCard, AutopilotPanel, BuyerRow, EmptyList, MessagesPanel, ProductsCard, RulesPanel, SettingsCard, STAGE } from "./parts";

const PROMPTS = [
  [Users, "Which buyers are most interested in my products?", "Ranked by what they did this month"],
  [ShoppingCart, "Who has abandoned their cart?", "Carts and checkouts left behind"],
  [BadgePercent, "Should I offer a discount to my hottest buyer?", "Never below your price floor"],
  [Gift, "Suggest personal deals for my best buyers", "One-use codes, only for them"],
  [MessageCircle, "Which products get interest but few sales?", "Where an offer helps most"],
  [Zap, "Enable autopilot for selected products", "You set the limits"],
];
// Follow-ups under Siyaa's latest answer.
const NEXT = ["Who is at checkout right now?", "Find new deals", "Which products get interest but few sales?"];
const MODE = {
  recommend: { label: "Recommend", dot: "#98A2B3" },
  approve: { label: "Approve first", dot: "#F79009" },
  autopilot: { label: "Autopilot", dot: "#12B76A" },
};
const STATS = [
  ["checkout", "At checkout", CreditCard, "Who is at checkout right now?"],
  ["cart", "In cart", ShoppingCart, "Who has abandoned their cart?"],
  ["considering", "Considering", Eye, "Which buyers are most interested in my products?"],
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
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
                <div className="rounded-2xl border border-[#EDE7DF] bg-white p-3.5">
                  <p className="m-0 mb-2 text-[12px] font-semibold text-ink">What they did</p>
                  <ol className="m-0 flex list-none flex-col gap-1.5 border-l border-[#EDE7DF] p-0 pl-3 text-[12.5px]">
                    {c.buyer.timeline.slice(0, 10).map((e, k) => (
                      <li key={k} className="relative flex justify-between gap-3">
                        <span className="absolute -left-[16.5px] top-[6px] h-2 w-2 rounded-full bg-[#F47A3D]" aria-hidden="true" />
                        <span className="text-ink">{{ view_product: "Viewed", search: "Searched", add_to_cart: "Added to cart", checkout_start: "Started checkout", purchase: "Bought" }[e.type]} {e.product || (e.query ? `“${e.query}”` : "")}</span>
                        <span className="shrink-0 text-ink-muted">{new Date(e.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                      </li>
                    ))}
                  </ol>
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

function Insights({ data, onAsk, reload, setSettings, tab, setTab }) {
  if (!data) return <Skeleton active className="p-4" />;
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#EDE7DF] px-4 pt-4 pb-3">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="m-0 text-[15px] font-semibold text-ink">Live insights</h2>
          <span className="text-[11.5px] text-ink-muted">Last 30 days</span>
        </div>
        <Tabs
          size="small"
          activeKey={tab}
          onChange={setTab}
          className="siyaa-tabs -mb-3"
          items={[
            { key: "buyers", label: "Buyers" },
            { key: "deals", label: `Deals${data.pending.length ? ` · ${data.pending.length}` : ""}` },
            { key: "messages", label: "Messages" },
            { key: "rules", label: "Rules" },
            { key: "autopilot", label: "Autopilot" },
          ]}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "buyers" && (
          <div className="flex flex-col gap-2.5">
            <p className="m-0 text-[12px] text-ink-muted">What buyers did on your store. Likelihoods are estimates.</p>
            {data.buyers.length ? data.buyers.map((b) => <BuyerRow key={b.key} b={b} onAsk={onAsk} />) : <EmptyList text="Buyers show up here as shoppers browse your store." />}
            {data.products.length > 0 && (
              <>
                <p className="m-0 mt-3 text-[13px] font-semibold text-ink">Product interest</p>
                <ProductsCard products={data.products} />
              </>
            )}
          </div>
        )}
        {tab === "deals" && (
          <div className="flex flex-col gap-2.5">
            <Button icon={<SiyaaMark size={16} />} onClick={() => apiFetch("/api/assistant/actions/recommend", { method: "POST" }).then(reload)}>
              Find new deals
            </Button>
            {data.pending.length ? data.pending.map((a) => <ActionCard key={a.id} action={a} onChanged={reload} />) : <EmptyList text="Nothing waiting for your approval." />}
            {data.recent.length > 0 && (
              <>
                <p className="m-0 mt-3 text-[13px] font-semibold text-ink">Activity log</p>
                {data.recent.map((a) => <ActionCard key={a.id} action={a} compact />)}
              </>
            )}
          </div>
        )}
        {tab === "messages" && <MessagesPanel />}
        {tab === "rules" && <RulesPanel />}
        {tab === "autopilot" && <AutopilotPanel settings={data.settings} usage={data.usage} platform={data.platform} onSaved={setSettings} />}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex gap-3" role="status" aria-live="polite">
      <SiyaaMark size={28} />
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-[#EDE7DF] bg-white px-4 py-3 text-[13px] text-ink-muted">
        Siyaa is looking at your store
        <span className="flex gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#F47A3D] motion-reduce:animate-none" style={{ animationDelay: `${i * 140}ms` }} />
          ))}
        </span>
      </div>
    </div>
  );
}

/** Siyaa AI — the sales assistant, a full-page workspace (Pro). */
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
  const [tab, setTab] = useState("buyers");
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
    if (messages.length || thinking) scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
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

  function showInsights(which) {
    setTab(which);
    if (typeof window !== "undefined" && window.innerWidth < 1280) setPanel(true);
  }

  if (locked) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-[#FBFAF8] p-6">
        <div className="max-w-lg rounded-3xl border border-[#EDE7DF] bg-white p-9 text-center shadow-[0_30px_80px_-50px_rgba(31,27,45,0.5)]">
          <SiyaaMark size={52} className="mx-auto mb-5" />
          <h1 className="m-0 text-[26px] font-semibold tracking-[-0.02em] text-ink">Siyaa AI comes with Pro</h1>
          <p className="mx-auto mt-2 mb-6 max-w-sm text-[14.5px] leading-relaxed text-ink-muted">
            Siyaa sees which buyers are about to buy, sends them personal offers on WhatsApp and negotiates within your limits — with your approval, or on autopilot.
          </p>
          <Link href="/admin/settings/billing">
            <Button type="primary" size="large" icon={<Crown size={16} />}>
              See Pro
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const settings = overview?.settings;
  const mode = settings ? (settings.paused ? { label: "Stopped", dot: "#F04438" } : MODE[settings.mode] || MODE.recommend) : null;
  const pending = overview?.pending.length || 0;
  const empty = messages.length === 0;
  const lastIsSiyaa = !thinking && messages.length > 0 && messages[messages.length - 1].role !== "user";
  const today = new Date().toDateString();
  const groups = [
    ["Today", chats.filter((c) => new Date(c.updatedAt).toDateString() === today)],
    ["Earlier", chats.filter((c) => new Date(c.updatedAt).toDateString() !== today)],
  ].filter(([, list]) => list.length);

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-[560px] bg-[#FBFAF8]">
      {/* Conversations */}
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-[#EDE7DF] bg-white md:flex">
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
          <SiyaaMark size={30} />
          <div className="min-w-0">
            <p className="m-0 text-[14.5px] font-semibold leading-tight text-ink">Siyaa AI</p>
            <p className="m-0 text-[11.5px] text-ink-muted">Your sales assistant</p>
          </div>
        </div>
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => (setChatId(null), setMessages([]))}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F1B2D] px-3 py-2.5 text-[13.5px] font-medium text-white transition hover:bg-[#2E2942] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F47A3D]"
          >
            <Plus size={15} aria-hidden="true" /> New chat
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-3" aria-label="Conversations">
          {groups.map(([label, list]) => (
            <div key={label} className="mt-2">
              <p className="m-0 px-2.5 pb-1 text-[11.5px] font-medium text-ink-muted">{label}</p>
              {list.map((c) => (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && openChat(c.id)}
                  onClick={() => openChat(c.id)}
                  className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] ${c.id === chatId ? "bg-[#FFF3E6] text-[#8A3B12]" : "text-ink hover:bg-[#F6F3EF]"}`}
                >
                  <span className="flex-1 truncate">{c.title}</span>
                  <button
                    type="button"
                    aria-label="Delete chat"
                    className="hidden shrink-0 rounded p-0.5 text-ink-muted hover:text-[#B42318] group-hover:block focus-visible:block"
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
            </div>
          ))}
          {!chats.length && <p className="px-2.5 pt-2 text-[12px] text-ink-muted">Your conversations with Siyaa appear here.</p>}
        </nav>
        {mode && (
          <button type="button" onClick={() => showInsights("autopilot")} className="m-3 flex items-center gap-2.5 rounded-xl border border-[#EDE7DF] px-3 py-2.5 text-left hover:bg-[#F6F3EF]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: mode.dot }} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11.5px] text-ink-muted">Mode</span>
              <span className="block text-[13px] font-semibold text-ink">{mode.label}</span>
            </span>
            <span className="text-[12px] text-[#C2410C]">Change</span>
          </button>
        )}
      </aside>

      {/* Conversation */}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[#EDE7DF] bg-white/85 px-4 py-2.5 backdrop-blur">
          <span className="flex min-w-0 items-center gap-2.5">
            <SiyaaMark size={28} />
            <span className="min-w-0">
              <span className="block text-[14.5px] font-semibold leading-tight text-ink">Ask Siyaa</span>
              <span className="block truncate text-[11.5px] text-ink-muted">Buyers, deals and follow-ups from your store&apos;s data</span>
            </span>
          </span>
          <span className="flex items-center gap-2">
            {mode && (
              <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-[#EDE7DF] bg-white px-2.5 py-1 text-[12px] font-medium text-ink lg:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: mode.dot }} aria-hidden="true" />
                {mode.label}
              </span>
            )}
            {pending > 0 && (
              <button type="button" onClick={() => showInsights("deals")} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#FFF3E6] px-2.5 py-1 text-[12px] font-semibold text-[#9A3412] hover:bg-[#FFE8D1]">
                <ClipboardCheck size={13} aria-hidden="true" /> {pending} to approve
              </button>
            )}
            <Tooltip title="Buyers, approvals, rules, autopilot">
              <Button className="xl:!hidden" icon={<PanelRight size={16} />} onClick={() => setPanel(true)} aria-label="Show insights" />
            </Tooltip>
          </span>
        </header>

        <div ref={scroller} className="relative flex-1 overflow-y-auto">
          {empty && <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_70%_at_50%_0%,rgba(255,181,71,0.20),rgba(222,63,91,0.06)_55%,transparent_80%)]" aria-hidden="true" />}
          <div className="relative mx-auto w-full max-w-[800px] px-4 py-6">
            {empty ? (
              <div className="pt-[5vh]">
                <div className="text-center">
                  <SiyaaMark size={56} className="mx-auto mb-5 drop-shadow-[0_14px_28px_rgba(244,122,61,0.35)]" />
                  <p className="m-0 text-[14px] font-medium text-[#C2410C]">{greeting()}</p>
                  <h1 className="m-0 mt-1 text-[30px] font-semibold tracking-[-0.025em] text-ink">What should we sell today?</h1>
                  <p className="mx-auto mt-2 max-w-[470px] text-[14.5px] leading-relaxed text-ink-muted">
                    I watch who&apos;s interested, draft personal offers, negotiate within your limits and follow up on WhatsApp.
                  </p>
                </div>

                {overview && (
                  <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {STATS.map(([stage, label, Icon, q]) => (
                      <button key={stage} type="button" onClick={() => ask(q)} className="group rounded-2xl border border-[#EDE7DF] bg-white px-3.5 py-3 text-left transition hover:border-[#F5C79E] hover:shadow-[0_12px_30px_-22px_rgba(244,122,61,0.8)]">
                        <span className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                          <Icon size={13} style={{ color: STAGE[stage].color }} aria-hidden="true" /> {label}
                        </span>
                        <span className="mt-1 block text-[24px] font-semibold tabular-nums tracking-[-0.02em] text-ink">{overview.buyers.filter((b) => b.stage === stage).length}</span>
                      </button>
                    ))}
                    <button type="button" onClick={() => showInsights("deals")} className="rounded-2xl border border-[#EDE7DF] bg-white px-3.5 py-3 text-left transition hover:border-[#F5C79E] hover:shadow-[0_12px_30px_-22px_rgba(244,122,61,0.8)]">
                      <span className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                        <ClipboardCheck size={13} className="text-[#C2410C]" aria-hidden="true" /> To approve
                      </span>
                      <span className="mt-1 block text-[24px] font-semibold tabular-nums tracking-[-0.02em] text-ink">{pending}</span>
                    </button>
                  </div>
                )}

                <p className="m-0 mt-8 mb-2.5 text-[13px] font-semibold text-ink">Try asking</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {PROMPTS.map(([Icon, p, hint]) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => ask(p)}
                      className="flex items-start gap-3 rounded-2xl border border-[#EDE7DF] bg-white px-4 py-3.5 text-left transition hover:border-[#F5C79E] hover:shadow-[0_12px_30px_-22px_rgba(244,122,61,0.8)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F47A3D]"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFF3E6] text-[#C2410C]">
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-medium leading-snug text-ink">{p}</span>
                        <span className="mt-0.5 block text-[12px] text-ink-muted">{hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[#1F1B2D] px-4 py-2.5 text-[14px] leading-relaxed text-white">{m.content}</div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex gap-3">
                      <SiyaaMark size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="m-0 mb-1 text-[12px] font-semibold text-ink">Siyaa</p>
                        <div className="whitespace-pre-wrap rounded-2xl rounded-tl-md border border-[#EDE7DF] bg-white px-4 py-3 text-[14px] leading-relaxed text-ink shadow-[0_10px_30px_-26px_rgba(31,27,45,0.6)]">{m.content}</div>
                        <Cards cards={m.data?.cards} onAsk={ask} onChanged={loadOverview} />
                      </div>
                    </div>
                  )
                )}
                {thinking && <Thinking />}
                {lastIsSiyaa && (
                  <div className="flex flex-wrap gap-2 pl-10">
                    {NEXT.map((q) => (
                      <button key={q} type="button" onClick={() => ask(q)} className="rounded-full border border-[#EDE7DF] bg-white px-3 py-1.5 text-[12.5px] text-ink hover:border-[#F5C79E] hover:bg-[#FFF8F1]">
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[#EDE7DF] bg-white px-4 pt-3 pb-2.5">
          <div className="mx-auto flex w-full max-w-[800px] items-end gap-2 rounded-[22px] border border-[#E4DDD3] bg-white p-2 pl-3 shadow-[0_14px_40px_-30px_rgba(31,27,45,0.7)] transition focus-within:border-[#F47A3D] focus-within:shadow-[0_0_0_4px_rgba(244,122,61,0.12)]">
            <Input.TextArea
              variant="borderless"
              autoSize={{ minRows: 1, maxRows: 6 }}
              placeholder="Ask Siyaa about buyers, deals, carts… e.g. “Create a deal for Priya”"
              aria-label="Ask Siyaa"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask();
                }
              }}
            />
            <button
              type="button"
              onClick={() => ask()}
              disabled={!draft.trim() || thinking}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFB547] via-[#F47A3D] to-[#DE3F5B] text-white transition disabled:from-[#E4DDD3] disabled:via-[#E4DDD3] disabled:to-[#E4DDD3] disabled:text-[#A39A8E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F47A3D]"
            >
              <ArrowUp size={17} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
          <p className="mx-auto mt-1.5 max-w-[800px] text-center text-[11px] text-ink-muted">
            Siyaa uses only your store&apos;s data. Offers never go below your floors, and messages always respect WhatsApp consent.
          </p>
        </div>
      </section>

      {/* Insights */}
      <aside className="hidden w-[380px] shrink-0 border-l border-[#EDE7DF] bg-[#FDFCFA] xl:block">
        <Insights data={overview} onAsk={ask} reload={loadOverview} setSettings={(s) => setOverview((o) => ({ ...o, settings: s }))} tab={tab} setTab={setTab} />
      </aside>
      <Drawer open={panel} onClose={() => setPanel(false)} width={400} styles={{ body: { padding: 0 } }} title="Siyaa · Live insights">
        <Insights data={overview} onAsk={(q) => (setPanel(false), ask(q))} reload={loadOverview} setSettings={(s) => setOverview((o) => ({ ...o, settings: s }))} tab={tab} setTab={setTab} />
      </Drawer>
    </div>
  );
}
