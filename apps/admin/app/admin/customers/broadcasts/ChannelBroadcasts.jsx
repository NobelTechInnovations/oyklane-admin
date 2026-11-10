"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Table, Button, Drawer, Steps, Form, Input, Select, InputNumber, Radio, DatePicker, App, Alert, Tag, Space, Statistic, Empty, Progress, Modal } from "antd";
import { Plus, Send, FlaskConical } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ImageUploadField } from "@/components/ImageUploadField";
import { CustomerPicker } from "@/components/broadcasts/CustomerPicker";

const STATUS = { draft: ["default", "Draft"], scheduled: ["blue", "Scheduled"], sending: ["processing", "Sending"], sent: ["green", "Sent"], cancelled: ["default", "Cancelled"], failed: ["red", "Failed"] };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const TOKENS = [
  ["{{first_name}}", "First name"],
  ["{{name}}", "Full name"],
  ["{{store_name}}", "Store name"],
];

/** Audience step, shared by email and SMS (and the same choices as WhatsApp). */
export function AudienceFields({ channel, segments, v }) {
  return (
    <>
      <Form.Item name="segment" label="Who gets it">
        <Radio.Group className="flex flex-col gap-1">
          {Object.entries(segments || {}).map(([k, label]) => (
            <Radio key={k} value={k}>
              {label}
            </Radio>
          ))}
        </Radio.Group>
      </Form.Item>
      {v.segment === "selected" && (
        <Form.Item name="customerIds" label="Customers" className="mb-3">
          <CustomerPicker channel={channel} />
        </Form.Item>
      )}
      {v.segment === "lapsed" && (
        <Form.Item name="days" label="No order in the last (days)" initialValue={60}>
          <InputNumber min={7} max={730} />
        </Form.Item>
      )}
      {v.segment !== "selected" && (
        <Form.Item name="minOrders" label="At least this many orders (optional)">
          <InputNumber min={0} max={100} />
        </Form.Item>
      )}
    </>
  );
}

function Composer({ channel, open, onClose, meta, onDone, draft }) {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [saved, setSaved] = useState(null);
  const [testTo, setTestTo] = useState("");
  const [when, setWhen] = useState("now");
  const [at, setAt] = useState(null);
  const bodyRef = useRef(null);
  const v = Form.useWatch([], form) || {};
  const sms = meta.sms || { templates: [] };
  const tpl = sms.templates.find((t) => t.key === v.templateKey);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    const c = draft?.content || {};
    form.setFieldsValue({
      name: draft?.name || `${channel === "email" ? "Email" : "SMS"} ${new Date().toLocaleDateString("en-IN")}`,
      segment: draft?.audience?.segment || "consented",
      customerIds: draft?.audience?.customerIds || [],
      days: draft?.audience?.days,
      minOrders: draft?.audience?.minOrders,
      subject: c.subject,
      heading: c.heading,
      body: c.body,
      imageUrl: c.imageUrl,
      buttonLabel: c.buttonLabel || (channel === "email" ? "Shop now" : undefined),
      buttonUrl: c.buttonUrl,
      templateKey: c.templateKey,
      values: c.values || [],
    });
    setSaved(draft || null);
    setStep(0);
    setPreview(null);
    setWhen("now");
    setAt(null);
  }, [open, draft, form, channel]);

  const body = () => ({
    name: v.name,
    content:
      channel === "email"
        ? { subject: v.subject, heading: v.heading, body: v.body, imageUrl: v.imageUrl, buttonLabel: v.buttonLabel, buttonUrl: v.buttonUrl }
        : { templateKey: v.templateKey, values: (tpl?.vars || []).map((name, i) => ({ name, source: v.values?.[i]?.source || "text", value: v.values?.[i]?.value || "" })) },
    audience: { segment: v.segment, customerIds: v.segment === "selected" ? v.customerIds || [] : undefined, days: v.days, minOrders: v.minOrders },
  });

  const runPreview = useCallback(async () => {
    setChecking(true);
    try {
      setPreview(await apiFetch(`/api/broadcasts/${channel}/preview`, { method: "POST", body: body() }));
    } catch (err) {
      setPreview({ error: err.message });
    } finally {
      setChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, JSON.stringify(body())]);

  useEffect(() => {
    if (!open) return;
    const ready = channel === "email" ? v.subject : v.templateKey;
    if (!ready) return;
    const t = setTimeout(runPreview, 500);
    return () => clearTimeout(t);
  }, [open, runPreview, channel, v.subject, v.templateKey]);

  async function saveDraft() {
    const out = saved?.id ? await apiFetch(`/api/broadcasts/${channel}/${saved.id}`, { method: "PATCH", body: body() }) : await apiFetch(`/api/broadcasts/${channel}`, { method: "POST", body: body() });
    setSaved(out.broadcast);
    return out.broadcast;
  }

  async function test() {
    try {
      await apiFetch(`/api/broadcasts/${channel}/test`, { method: "POST", body: { ...body(), to: testTo } });
      message.success(channel === "email" ? "Test sent — check your inbox" : "Test SMS sent");
    } catch (err) {
      message.error(err.message);
    }
  }

  function insert(token) {
    const el = bodyRef.current?.resizableTextArea?.textArea;
    const cur = form.getFieldValue("body") || "";
    const pos = el ? el.selectionStart : cur.length;
    form.setFieldValue("body", `${cur.slice(0, pos)}${token}${cur.slice(pos)}`);
  }

  function confirmSend() {
    modal.confirm({
      title: when === "now" ? `Send to ${preview?.recipients ?? 0} customers now?` : `Schedule for ${at?.format("D MMM, h:mm a")}?`,
      content: (
        <div className="text-sm">
          {channel === "sms" ? (
            <p>
              About {inr(preview?.estimatedCost)} ({inr(preview?.pricePerMessage)} per SMS + GST), added to your next Oyklane bill.
            </p>
          ) : (
            <p>Emails go from your store&apos;s name, with an unsubscribe link at the bottom.</p>
          )}
          <p className="m-0">Messages can&apos;t be unsent.</p>
        </div>
      ),
      okText: when === "now" ? "Send now" : "Schedule",
      onOk: async () => {
        try {
          const bc = await saveDraft();
          await apiFetch(`/api/broadcasts/${channel}/${bc.id}/schedule`, { method: "POST", body: { confirm: true, scheduledAt: when === "later" ? at?.toISOString() : null } });
          message.success(when === "now" ? "Sending — it starts within a minute" : "Scheduled");
          onDone();
        } catch (err) {
          message.error(err.message);
        }
      },
    });
  }

  const messageOk =
    channel === "email"
      ? Boolean(v.name && v.subject && (v.body || v.heading) && (!v.buttonLabel || /^https:\/\//.test(v.buttonUrl || "")))
      : Boolean(tpl && (tpl.vars || []).every((_, i) => (v.values?.[i]?.source || "text") !== "text" || v.values?.[i]?.value));
  const canNext = [messageOk, Boolean(preview?.recipients), true];

  return (
    <Drawer title={channel === "email" ? "New email broadcast" : "New SMS broadcast"} open={open} onClose={onClose} width={1000} destroyOnHidden>
      <Steps current={step} size="small" className="mb-6" items={[{ title: "Message" }, { title: "Audience" }, { title: "Test" }, { title: "Send" }]} />
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <Form form={form} layout="vertical" requiredMark={false}>
          <div className={step === 0 ? "" : "hidden"}>
            <Form.Item name="name" label="Name (only you see it)">
              <Input maxLength={120} />
            </Form.Item>
            {channel === "email" ? (
              <>
                <Form.Item name="subject" label="Subject">
                  <Input maxLength={150} placeholder="Diwali sale: 20% off everything" />
                </Form.Item>
                <Form.Item name="imageUrl" label="Banner image (optional)">
                  <ImageUploadField hint="Wide images look best — 1200 × 600 px." />
                </Form.Item>
                <Form.Item name="heading" label="Heading">
                  <Input maxLength={150} placeholder="Hi {{first_name}}, our sale is on" />
                </Form.Item>
                <Form.Item name="body" label="Message" extra="A blank line starts a new paragraph." className="mb-1">
                  <Input.TextArea ref={bodyRef} rows={7} maxLength={8000} showCount placeholder={"Everything in the store is 20% off until Sunday.\n\nUse code DIWALI20 at checkout."} />
                </Form.Item>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {TOKENS.map(([t, label]) => (
                    <Button key={t} size="small" onClick={() => insert(t)}>
                      + {label}
                    </Button>
                  ))}
                </div>
                <div className="grid sm:grid-cols-[180px_1fr] gap-2">
                  <Form.Item name="buttonLabel" label="Button">
                    <Input maxLength={40} />
                  </Form.Item>
                  <Form.Item name="buttonUrl" label="Button link" rules={[{ pattern: /^https:\/\//, message: "A full https:// link" }]}>
                    <Input placeholder="https://yourstore.com/collections/sale" />
                  </Form.Item>
                </div>
              </>
            ) : !sms.ready ? (
              <Alert type="info" showIcon message="SMS broadcasts are being set up on Oyklane" description="India's DLT rules need each SMS template registered first. Use WhatsApp or email meanwhile." />
            ) : (
              <>
                <Form.Item name="templateKey" label="SMS template" extra="SMS in India can only use DLT-registered templates — fill in the blanks below.">
                  <Select placeholder="Choose a template" options={sms.templates.map((t) => ({ value: t.key, label: t.name }))} onChange={(k) => form.setFieldValue("values", (sms.templates.find((t) => t.key === k)?.vars || []).map((_, i) => ({ source: i === 0 ? "customer.first_name" : "text", value: "" })))} />
                </Form.Item>
                {tpl &&
                  tpl.vars.map((name, i) => (
                    <div key={name} className="grid grid-cols-[1fr_1fr] gap-2">
                      <Form.Item name={["values", i, "source"]} label={`Blank ${i + 1}`} initialValue="text">
                        <Select options={meta.valueSources} />
                      </Form.Item>
                      {(v.values?.[i]?.source || "text") === "text" && (
                        <Form.Item name={["values", i, "value"]} label="Text">
                          <Input maxLength={30} />
                        </Form.Item>
                      )}
                    </div>
                  ))}
              </>
            )}
          </div>
          <div className={step === 1 ? "" : "hidden"}>
            <AudienceFields channel={channel} segments={meta.segments} v={v} />
            <Alert
              type="info"
              showIcon
              message={`Only customers who agreed to ${channel === "email" ? "marketing emails" : "marketing SMS"} get it`}
              description={channel === "email" ? "Every email has an unsubscribe link; whoever uses it is left out of the next one." : "Customers without a valid mobile number are left out."}
            />
            {preview && !preview.error && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <Statistic title="Will receive" value={preview.recipients} />
                <Statistic title="Matched" value={preview.matched} />
                <Statistic title="Not agreed" value={preview.skipped?.noConsent ?? 0} />
                {channel === "sms" ? <Statistic title="Estimated cost" value={inr(preview.estimatedCost)} /> : <Statistic title="No address" value={preview.skipped?.noAddress ?? 0} />}
              </div>
            )}
            {preview?.error && <Alert className="mt-3" type="warning" showIcon message={preview.error} />}
            {preview && !preview.error && preview.recipients === 0 && (
              <Alert type="warning" showIcon className="mt-3" message="Nobody here can get it yet" description="Customers agree at checkout or sign-up; you can also mark it on a customer's page when they told you." />
            )}
          </div>
          <div className={step === 2 ? "" : "hidden"}>
            <p className="text-sm">Send one to yourself first. Customer names show as &quot;Test customer&quot;.</p>
            <Space.Compact className="w-full max-w-md">
              <Input placeholder={channel === "email" ? "you@example.com" : "Your number, +91…"} value={testTo} onChange={(e) => setTestTo(e.target.value)} />
              <Button icon={<FlaskConical size={14} aria-hidden="true" />} disabled={testTo.trim().length < 6} onClick={test}>
                Send test
              </Button>
            </Space.Compact>
            {channel === "sms" && <p className="text-xs text-ink-muted mt-2">A test SMS is charged like any other.</p>}
          </div>
          <div className={step === 3 ? "" : "hidden"}>
            <Radio.Group value={when} onChange={(e) => setWhen(e.target.value)} className="flex flex-col gap-2">
              <Radio value="now">Send now</Radio>
              <Radio value="later">Schedule for later</Radio>
            </Radio.Group>
            {when === "later" && <DatePicker showTime={{ format: "h:mm a", minuteStep: 15 }} format="D MMM YYYY, h:mm a" className="mt-3" value={at} onChange={setAt} disabledDate={(d) => d && d.isBefore(new Date(), "day")} />}
            {preview && !preview.error && (
              <p className="text-sm mt-4 mb-0">
                <b>{preview.recipients}</b> customer{preview.recipients === 1 ? "" : "s"}
                {channel === "sms" ? ` · about ${inr(preview.estimatedCost)} + GST` : ""}
              </p>
            )}
          </div>
        </Form>
        <div className="min-w-0">
          <p className="m-0 mb-2 text-[12.5px] font-medium text-ink-muted">What customers see</p>
          {channel === "email" ? (
            preview?.html ? (
              <div className="rounded-[12px] border border-app-border overflow-hidden bg-white">
                <p className="m-0 px-3 py-2 text-[13px] border-b border-app-border truncate">
                  <span className="text-ink-muted">Subject:</span> {preview.subject}
                </p>
                <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="block w-full h-[560px] border-0" />
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Add a subject to see the email.</p>
            )
          ) : preview?.text ? (
            <div className="rounded-[16px] bg-[#EEF1F5] p-4">
              <p className="m-0 rounded-[14px] rounded-bl-[4px] bg-white px-3 py-2 text-[14px] leading-snug text-ink whitespace-pre-wrap shadow-sm">{preview.text}</p>
              <p className="m-0 mt-2 text-[12px] text-ink-muted tabular-nums">
                {preview.text.length} characters · {preview.parts} SMS{preview.parts > 1 ? " each (charged per part)" : ""}
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Choose a template.</p>
          )}
          {checking && <p className="text-xs text-ink-muted mt-2">Updating…</p>}
        </div>
      </div>
      <div className="flex justify-between mt-6">
        <Button disabled={step === 0} onClick={() => setStep(step - 1)}>
          Back
        </Button>
        <Space>
          <Button
            disabled={!messageOk}
            onClick={async () => {
              try {
                await saveDraft();
                message.success("Draft saved");
                onDone();
              } catch (err) {
                message.error(err.message);
              }
            }}
          >
            Save draft
          </Button>
          {step < 3 ? (
            <Button type="primary" disabled={!canNext[step] || (step === 1 && checking)} onClick={() => setStep(step + 1)}>
              Next
            </Button>
          ) : (
            <Button type="primary" icon={<Send size={14} aria-hidden="true" />} disabled={(when === "later" && !at) || !preview?.recipients} onClick={confirmSend}>
              {when === "now" ? "Send" : "Schedule"}
            </Button>
          )}
        </Space>
      </div>
    </Drawer>
  );
}

function Report({ channel, id, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!id) return;
    setData(null);
    apiFetch(`/api/broadcasts/${channel}/${id}`).then(setData).catch(() => setData({ error: true }));
  }, [id, channel]);
  const b = data?.broadcast;
  return (
    <Modal open={Boolean(id)} onCancel={onClose} footer={null} width={720} title={b?.name || "Broadcast"}>
      {!b ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          {b.error && <Alert type={b.status === "failed" ? "error" : "warning"} showIcon message={b.error} />}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Statistic title="Sent" value={b.sent} suffix={`/ ${b.recipients}`} />
            <Statistic title="Failed" value={b.failed} />
            <Statistic title="Left out" value={b.skipped} />
            <Statistic title="Orders (7 days)" value={b.orders} />
            <Statistic title="Order value" value={inr(b.revenue)} />
            {channel === "sms" && <Statistic title="Cost" value={inr(Number(b.pricePerMessage || 0) * b.sent)} />}
          </div>
          {b.status === "sending" && <Progress percent={pct(b.sent + b.failed, b.recipients)} />}
          <p className="text-xs text-ink-muted m-0">Orders are your store&apos;s orders from recipients within 7 days of their message — they may have bought for other reasons too.</p>
          {data.problems?.length > 0 && (
            <Table
              size="small"
              rowKey={(r) => r.to}
              pagination={false}
              dataSource={data.problems}
              columns={[
                { title: "Customer", render: (_, r) => r.name || r.to },
                { title: "", dataIndex: "status", render: (s) => <Tag color={s === "failed" ? "red" : "default"}>{s === "failed" ? "Not sent" : "Left out"}</Tag> },
                { title: "Why", dataIndex: "error" },
              ]}
            />
          )}
        </div>
      )}
    </Modal>
  );
}

/** One channel's list of broadcasts, with the composer and reports. */
export default function ChannelBroadcasts({ channel, canEdit, meta }) {
  const { message } = App.useApp();
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [report, setReport] = useState(null);

  const load = useCallback(async () => {
    try {
      setRows((await apiFetch(`/api/broadcasts/${channel}`)).broadcasts);
    } catch (err) {
      setRows([]);
      message.error(err.message);
    }
  }, [channel, message]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!rows?.some((r) => r.status === "sending" || r.status === "scheduled")) return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [rows, load]);

  const act = (path, method = "POST") => async (e) => {
    e.stopPropagation();
    try {
      await apiFetch(path, { method });
      load();
    } catch (err) {
      message.error(err.message);
    }
  };
  const smsOff = channel === "sms" && !meta.sms?.ready;

  return (
    <div className="flex flex-col gap-3">
      {!meta.ready && <Alert type="info" showIcon message="Email and SMS broadcasts are being switched on — they'll be ready here shortly." />}
      {smsOff && <Alert type="info" showIcon message="SMS broadcasts are being set up on Oyklane" description="India's DLT rules need each SMS template registered before it's sent. Meanwhile use WhatsApp or email." />}
      <div className="flex justify-end">
        {canEdit && (
          <Button
            type="primary"
            icon={<Plus size={14} aria-hidden="true" />}
            disabled={!meta.ready || smsOff}
            onClick={() => {
              setDraft(null);
              setOpen(true);
            }}
          >
            New {channel === "email" ? "email" : "SMS"}
          </Button>
        )}
      </div>
      <Table
        rowKey="id"
        loading={rows === null}
        dataSource={rows || []}
        scroll={{ x: 760 }}
        onRow={(r) => ({
          onClick: () => (r.status === "draft" ? canEdit && (setDraft(r), setOpen(true)) : setReport(r.id)),
          className: "cursor-pointer",
        })}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No ${channel === "email" ? "email" : "SMS"} broadcasts yet.`} /> }}
        columns={[
          { title: "Name", dataIndex: "name", render: (val, r) => <span className="font-medium">{val}{channel === "email" && r.content?.subject && <span className="block text-xs text-ink-muted font-normal truncate max-w-[320px]">{r.content.subject}</span>}</span> },
          { title: "Status", dataIndex: "status", render: (s, r) => <Tag color={STATUS[s]?.[0]}>{STATUS[s]?.[1] || s}{s === "scheduled" && r.scheduledAt ? ` · ${new Date(r.scheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : ""}</Tag> },
          { title: "Sent", render: (_, r) => (r.recipients ? `${r.sent}/${r.recipients}` : "—") },
          { title: "Failed", dataIndex: "failed", render: (n) => n || "—" },
          { title: "Orders", render: (_, r) => (r.orders ? `${r.orders} · ${inr(r.revenue)}` : "—") },
          {
            title: "",
            align: "right",
            render: (_, r) =>
              !canEdit ? null : r.status === "draft" || r.status === "cancelled" ? (
                <Button size="small" type="text" danger onClick={act(`/api/broadcasts/${channel}/${r.id}`, "DELETE")}>
                  Delete
                </Button>
              ) : ["scheduled", "sending"].includes(r.status) ? (
                <Button size="small" danger onClick={act(`/api/broadcasts/${channel}/${r.id}/cancel`)}>
                  {r.status === "sending" ? "Stop" : "Cancel"}
                </Button>
              ) : null,
          },
        ]}
      />
      <Composer
        channel={channel}
        open={open}
        draft={draft}
        meta={meta}
        onClose={() => setOpen(false)}
        onDone={() => {
          setOpen(false);
          load();
        }}
      />
      <Report channel={channel} id={report} onClose={() => setReport(null)} />
    </div>
  );
}
