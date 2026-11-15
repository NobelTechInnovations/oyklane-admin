"use client";

import { Alert } from "antd";
import { WaTemplates } from "@shopcycle/ui";
import { apiFetch, API_URL } from "@/lib/api";

/** The store's templates — or, on Oyklane's shared number, Oyklane's (read-only). */
export default function Templates({ canEdit }) {
  return (
    <WaTemplates
      apiFetch={apiFetch}
      apiUrl={API_URL}
      base="/api/whatsapp"
      canEdit={canEdit}
      managedNotice={
        <Alert
          type="info"
          showIcon
          message="Default templates"
          description="Approved templates on Oyklane's number — order updates and sign-in codes, with your store's name in them. Offers, broadcasts and your own templates need your own WhatsApp number."
        />
      }
    />
  );
}
