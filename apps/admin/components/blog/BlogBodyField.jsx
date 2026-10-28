"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { App, Button, Form, Input, Modal, Segmented, Select, Skeleton } from "antd";
import { Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";

// CKEditor reads `window`, so it loads in the browser only.
const CkBlogEditor = dynamic(() => import("./CkBlogEditor"), { ssr: false, loading: () => <Skeleton active paragraph={{ rows: 8 }} /> });

const LENGTHS = [
  { label: "Short", value: "short" },
  { label: "Medium", value: "medium" },
  { label: "Long", value: "long" },
];
const TONES = [
  { label: "Friendly", value: "friendly" },
  { label: "Professional", value: "professional" },
  { label: "Storytelling", value: "story" },
  { label: "Expert tips", value: "expert" },
];
const LANGS = [
  { label: "English", value: "en" },
  { label: "Hindi", value: "hi" },
  { label: "Hinglish", value: "hinglish" },
];

// Older posts were plain text (a blank line between paragraphs): give the
// editor the same paragraphs the store shows.
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
function asHtml(text) {
  const t = String(text || "");
  if (!t || /<\/?[a-z][^>]*>/i.test(t)) return t;
  return t
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/[&<>"]/g, (c) => ESC[c]).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * The blog post body: a formatted editor (CKEditor) plus "Write with AI" —
 * a draft from a topic and points, or a polish of what's written. `form` is
 * the post's form, so the AI can also fill an empty title, excerpt and SEO.
 */
export function BlogBodyField({ value, onChange, form }) {
  const { message, modal } = App.useApp();
  const editorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ai] = Form.useForm();

  function put(html, mode) {
    const ed = editorRef.current;
    const next = mode === "append" && value ? `${value}\n${html}` : html;
    if (ed) ed.setData(next);
    onChange?.(next);
  }

  async function write(mode) {
    const v = await ai.validateFields();
    setBusy(mode);
    try {
      const { post } = await apiFetch("/api/blog/ai/write", { method: "POST", body: { ...v, mode, current: mode === "improve" ? value : undefined } });
      const hasText = String(value || "").replace(/<[^>]+>/g, "").trim().length > 0;
      const apply = (how) => {
        put(post.html, how);
        const fill = {};
        for (const k of ["title", "excerpt", "seoTitle", "seoDescription"]) if (post[k] && !form?.getFieldValue(k)) fill[k] = post[k];
        if (Object.keys(fill).length) form?.setFieldsValue(fill);
        setOpen(false);
        message.success(mode === "improve" ? "Post polished — check it before publishing" : "Draft written — check it before publishing");
      };
      if (mode === "draft" && hasText) {
        modal.confirm({ title: "Your post already has text", content: "Replace it with the AI draft, or add the draft below it?", okText: "Replace", cancelText: "Add below", onOk: () => apply("replace"), onCancel: () => apply("append") });
      } else apply("replace");
    } catch (err) {
      if (err?.message) message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[13px] text-ink-muted">Headings, lists, links, images and tables — shown on your store as you format them.</span>
        <Button size="small" icon={<Sparkles size={14} aria-hidden="true" />} onClick={() => {
          ai.setFieldsValue({ topic: ai.getFieldValue("topic") || form?.getFieldValue("title") || "" });
          setOpen(true);
        }}>
          Write with AI
        </Button>
      </div>
      <CkBlogEditor value={asHtml(value)} onChange={onChange} onReady={(ed) => (editorRef.current = ed)} />
      <Modal open={open} onCancel={() => setOpen(false)} title="Write with AI" footer={null} destroyOnClose={false} width={520}>
        <Form form={ai} layout="vertical" requiredMark={false} initialValues={{ length: "medium", tone: "friendly", language: "en" }}>
          <Form.Item name="topic" label="What's the post about?" rules={[{ required: true, min: 3, message: "A few words about the topic" }]}>
            <Input maxLength={300} placeholder="How to pick the right turmeric for daily cooking" />
          </Form.Item>
          <Form.Item name="points" label="Points to cover (optional)" extra="Your facts — product names, how you make it, tips. The AI won't invent prices, offers or health claims.">
            <Input.TextArea rows={4} maxLength={1500} placeholder={"Grown in Meghalaya\nHigh curcumin\nHow to store it"} />
          </Form.Item>
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Form.Item name="tone" label="Tone">
              <Select options={TONES} />
            </Form.Item>
            <Form.Item name="language" label="Language">
              <Select options={LANGS} />
            </Form.Item>
          </div>
          <Form.Item name="length" label="Length">
            <Segmented options={LENGTHS} block />
          </Form.Item>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => write("improve")} loading={busy === "improve"} disabled={Boolean(busy)}>
              Polish what I wrote
            </Button>
            <Button type="primary" icon={<Sparkles size={14} aria-hidden="true" />} onClick={() => write("draft")} loading={busy === "draft"} disabled={Boolean(busy)}>
              Write draft
            </Button>
          </div>
          <p className="m-0 mt-3 text-[12px] text-ink-muted">AI can get things wrong — read the post before you publish it.</p>
        </Form>
      </Modal>
    </div>
  );
}
