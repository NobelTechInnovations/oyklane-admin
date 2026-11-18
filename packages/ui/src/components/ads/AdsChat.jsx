"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Drawer, Input, Tooltip } from "antd";
import { MessageSquare, RotateCcw, Send, Square } from "lucide-react";
import { Markdown } from "../Markdown";
import { streamNdjson, useAdsCoach } from "./context";

// Questions to start with, by where the chat was opened.
const PROMPTS = {
  campaigns: ["How are my ads doing this week?", "Where should more budget go?", "Which ads should I pause?", "What should my next campaign be?"],
  builder: ["Is this budget enough?", "Suggest audiences for this campaign", "Write 3 headlines for this product", "How should I split the budget?"],
  insights: ["Explain these results simply", "What should I change first?", "Why is the cost per purchase what it is?", "Which ads should I pause?"],
  analytics: ["Where do people drop off?", "Which ages or placements work best?", "What should I change first?"],
  tests: ["Which version is winning?", "How long should this test run?", "What should I test next?"],
};

// Image previews are big and say nothing to the coach.
const lean = (draft) => (draft ? JSON.parse(JSON.stringify(draft, (k, v) => (/Preview$/.test(k) ? undefined : v))) : undefined);

/**
 * The AI chat panel. `context` says where it was opened ({ kind, screen,
 * step, range, draft, data }); the API adds the ad account's real numbers.
 * The conversation stays while the page is open.
 */
export function AdsChat({ open, onClose, context }) {
  const api = useAdsCoach();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const ctrl = useRef(null);
  const end = useRef(null);
  const prompts = PROMPTS[context?.kind] || PROMPTS.campaigns;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages]);
  useEffect(() => () => ctrl.current?.abort(), []);

  async function ask(question) {
    const q = String(question || "").trim();
    if (!q || busy) return;
    setError(null);
    const turns = [...messages, { role: "user", content: q }];
    setMessages([...turns, { role: "assistant", content: "" }]);
    setText("");
    setBusy(true);
    const controller = new AbortController();
    ctrl.current = controller;
    let answer = "";
    try {
      const body = {
        messages: turns.slice(-12).map(({ role, content }) => ({ role, content })),
        context: { screen: context?.screen, step: context?.step, range: context?.range, draft: lean(context?.draft), data: context?.data },
      };
      await streamNdjson(
        api.url("/coach/chat"),
        body,
        (ev) => {
          if (ev.type === "delta") {
            answer += ev.text;
            setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: answer }]);
          }
          if (ev.type === "error") setError(ev.message);
        },
        controller.signal
      );
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      // An empty answer (stopped or failed) isn't kept.
      setMessages((m) => (answer ? [...m.slice(0, -1), { role: "assistant", content: answer }] : m.slice(0, -1)));
      setBusy(false);
      ctrl.current = null;
    }
  }

  function reset() {
    ctrl.current?.abort();
    setMessages([]);
    setError(null);
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="min(440px, 100vw)"
      title={
        <span className="inline-flex items-center gap-2">
          <MessageSquare size={16} className="text-accent" aria-hidden="true" />
          Ask AI about your ads
        </span>
      }
      extra={
        messages.length ? (
          <Tooltip title="Start a new conversation">
            <Button size="small" type="text" icon={<RotateCcw size={14} aria-hidden="true" />} onClick={reset} aria-label="Start a new conversation" />
          </Tooltip>
        ) : null
      }
      styles={{ body: { padding: 0, display: "flex", flexDirection: "column" } }}
    >
      <div className="flex-1 overflow-y-auto px-4 py-3" aria-live="polite">
        {!messages.length ? (
          <div className="flex flex-col gap-2">
            <p className="m-0 mb-1 text-sm text-ink-muted">
              {api.mode === "managed" ? "Ask about this client's ads." : "Ask anything about your ads."} Answers use the ad account&apos;s real numbers{context?.screen ? ` and what's on the ${context.screen} screen` : ""}.
            </p>
            {prompts.map((p) => (
              <button key={p} type="button" className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-left text-sm transition-colors hover:border-accent hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" onClick={() => ask(p)}>
                {p}
              </button>
            ))}
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "user" ? (
                <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-accent px-3 py-2 text-sm text-white">{m.content}</div>
              ) : (
                <div className="max-w-[92%] rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm">{m.content ? <Markdown text={m.content} /> : <span className="text-ink-muted">Reading the numbers…</span>}</div>
              )}
            </div>
          ))
        )}
        {error && <Alert className="mt-2" type="error" showIcon message={error} />}
        <div ref={end} />
      </div>
      <div className="border-t border-app-border p-3">
        <div className="flex items-end gap-2">
          <Input.TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoSize={{ minRows: 1, maxRows: 5 }}
            maxLength={2000}
            placeholder="Ask about budgets, audiences, results…"
            aria-label="Your question"
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                ask(text);
              }
            }}
          />
          {busy ? (
            <Button icon={<Square size={14} aria-hidden="true" />} onClick={() => ctrl.current?.abort()} aria-label="Stop answering" />
          ) : (
            <Button type="primary" icon={<Send size={14} aria-hidden="true" />} onClick={() => ask(text)} disabled={!text.trim()} aria-label="Send" />
          )}
        </div>
        <p className="m-0 mt-1.5 text-[11px] text-ink-subtle">The coach can be wrong and never changes ads by itself. Check the numbers before acting.</p>
      </div>
    </Drawer>
  );
}
