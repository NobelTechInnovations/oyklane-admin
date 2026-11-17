"use client";

import { useEffect, useState } from "react";
import { Form, Select } from "antd";
import { apiFetch } from "@/lib/api";

// First guess from the browser's clock; the seller confirms it.
const BY_ZONE = [
  [/^Asia\/(Kolkata|Calcutta)$/, "IN"],
  [/^America\//, "US"],
  [/^Europe\/London$/, "GB"],
  [/^Europe\/Berlin$/, "DE"],
  [/^Europe\/Paris$/, "FR"],
  [/^Asia\/Tokyo$/, "JP"],
];
export function guessCountry() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    return BY_ZONE.find(([re]) => re.test(zone))?.[1] || "IN";
  } catch {
    return "IN";
  }
}

const FALLBACK = [
  { code: "IN", name: "India", flag: "🇮🇳", currency: "INR" },
  { code: "US", name: "United States", flag: "🇺🇸", currency: "USD" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP" },
  { code: "DE", name: "Germany", flag: "🇩🇪", currency: "EUR" },
  { code: "FR", name: "France", flag: "🇫🇷", currency: "EUR" },
  { code: "JP", name: "Japan", flag: "🇯🇵", currency: "JPY" },
];

/**
 * "Where is your business registered?" — the first thing asked when a store
 * is created (sign-up, Google sign-up, a new store from the top bar). It sets
 * the store's currency, taxes, payment options and login codes in one go,
 * and can't be changed afterwards (GLOBAL-PLAN.md).
 */
export function CountryField({ name = "country" }) {
  const [countries, setCountries] = useState(FALLBACK);
  useEffect(() => {
    apiFetch("/api/auth/countries")
      .then((r) => r?.countries?.length && setCountries(r.countries))
      .catch(() => {});
  }, []);
  return (
    <Form.Item
      label="Where is your business registered?"
      name={name}
      extra="Sets your currency, taxes, payment options and login codes. It can't be changed later. A business in another country gets its own store."
      rules={[{ required: true, message: "Choose your country" }]}
    >
      <Select
        showSearch
        optionFilterProp="label"
        options={countries.map((c) => ({ value: c.code, label: `${c.flag} ${c.name} · ${c.currency}` }))}
      />
    </Form.Item>
  );
}
