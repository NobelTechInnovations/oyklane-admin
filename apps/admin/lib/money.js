import { formatCurrency as format, countryOf } from "@shopcycle/utils";

/**
 * The store's own money, in the store's currency (set by its country at
 * sign-up). AdminShell sets it as the dashboard loads, so any amount of the
 * store's — prices, orders, discounts — reads €, $, £ or ¥ instead of ₹.
 * Oyklane's own charges (plans, SMS, shipping wallet) stay in ₹: use
 * @shopcycle/utils' formatCurrency(amount, "INR") for those.
 */
let current = { currency: "INR", country: "IN" };

export function setStoreMoney(store) {
  if (!store) return;
  current = { currency: String(store.currency || "INR").toUpperCase(), country: countryOf(store).code };
}

export const storeCurrency = () => current.currency;
export const storeCountry = () => countryOf(current.country);

/** formatCurrency with the store's currency as the default. */
export function formatCurrency(amount, currency) {
  return format(amount, currency || current.currency);
}

/** "₹", "€", "$", "£", "￥" — for price fields' prefix. */
export function currencySymbol(currency) {
  const code = currency || current.currency;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((p) => p.type === "currency")?.value || code;
  } catch {
    return code;
  }
}

/** 1,299 or 1,299.5 in the store's currency, without a forced ".00". */
export function money(n, { maxDecimals = 2 } = {}) {
  const code = current.currency;
  const locale = { INR: "en-IN", USD: "en-US", GBP: "en-GB", EUR: "de-DE", JPY: "ja-JP" }[code] || "en-IN";
  return new Intl.NumberFormat(locale, { style: "currency", currency: code, minimumFractionDigits: 0, maximumFractionDigits: code === "JPY" ? 0 : maxDecimals }).format(Number(n || 0));
}
