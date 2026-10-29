"use client";

import { useEffect, useState } from "react";
import { App, Form, Input, Modal, Segmented, Select } from "antd";
import { apiFetch } from "@/lib/api";

const tomorrow = () => new Date(Date.now() + 86400000 + 5.5 * 3600000).toISOString().slice(0, 10);

/** A parcel the courier couldn't deliver (NDR): try again on a day — with
 * the buyer's new phone or address if they gave one — or send it back. */
export function NdrDialog({ shipment, open, onClose, onDone }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [action, setAction] = useState("reattempt");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setAction("reattempt");
      form.setFieldsValue({ date: tomorrow(), time: "12:00:00", phone: "", address: "", addressType: "home", remark: "" });
    }
  }, [open, form]);

  async function submit() {
    const v = await form.validateFields();
    setBusy(true);
    try {
      await apiFetch(`/api/shipping/oyklane/shipments/${shipment.id}/ndr`, { method: "POST", body: { ...v, action } });
      message.success(action === "rto" ? "Return requested" : "Re-attempt requested");
      onDone?.();
      onClose?.();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onCancel={onClose} onOk={submit} confirmLoading={busy} okText={action === "rto" ? "Return to me" : "Try again"} okButtonProps={{ danger: action === "rto" }} title={`Delivery failed${shipment?.orderNumber ? ` — order #${shipment.orderNumber}` : ""}`} destroyOnHidden>
      {shipment?.partnerStatus && <p className="m-0 mb-3 text-[13px] text-ink-muted">{shipment.partnerStatus}</p>}
      <Segmented
        block
        value={action}
        onChange={setAction}
        options={[
          { label: "Try delivering again", value: "reattempt" },
          { label: "Return to me (RTO)", value: "rto" },
        ]}
        className="!mb-4"
      />
      <Form form={form} layout="vertical" requiredMark={false}>
        {action === "reattempt" ? (
          <>
            <div className="grid grid-cols-2 gap-x-3">
              <Form.Item name="date" label="Day" rules={[{ required: true, message: "Pick a day" }]}>
                <Input type="date" min={tomorrow()} />
              </Form.Item>
              <Form.Item name="time" label="Around">
                <Select
                  options={[
                    { value: "10:00:00", label: "Morning" },
                    { value: "12:00:00", label: "Afternoon" },
                    { value: "16:00:00", label: "Evening" },
                  ]}
                />
              </Form.Item>
            </div>
            <Form.Item name="phone" label="Buyer's phone (if it changed)" rules={[{ pattern: /^\D*(\d\D*){10}$/, message: "10-digit number" }]}>
              <Input inputMode="tel" placeholder="Optional" />
            </Form.Item>
            <Form.Item name="address" label="Address (if it changed)">
              <Input.TextArea rows={2} maxLength={200} placeholder="Optional" />
            </Form.Item>
            <Form.Item name="addressType" label="Address type" className="!mb-0">
              <Segmented
                options={[
                  { label: "Home", value: "home" },
                  { label: "Office", value: "office" },
                ]}
              />
            </Form.Item>
          </>
        ) : (
          <Form.Item name="remark" label="Why (for the courier)" rules={[{ required: true, message: "A short reason" }]}>
            <Input maxLength={200} placeholder="Customer refused / not reachable" />
          </Form.Item>
        )}
      </Form>
      {action === "rto" && <p className="m-0 mt-2 text-[12.5px] text-ink-muted">The parcel comes back to your pickup address.</p>}
    </Modal>
  );
}
