/**
 * Where a store's business is registered (Store.homeCountry), chosen once
 * at sign-up. The country sets everything that follows from the law and the
 * banks there, all at once, and it can't be changed afterwards: an India
 * store stays an India store (GST, INR, UPI…), and a business registered in
 * Germany opens its own store with Germany. See GLOBAL-PLAN.md.
 *
 * `home: false` countries can't be a home country yet; stores can still
 * sell to them later (markets).
 */
const COUNTRIES = {
  IN: {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    home: true,
    currency: "INR",
    timezone: "Asia/Kolkata",
    locale: "en-IN",
    language: "en",
    dialCode: "91",
    tax: { system: "gst", label: "GST", inclusive: true },
    gateways: ["payu", "razorpay", "cashfree", "stripe", "paypal"],
    cod: true,
    // Oyklane's SMS route (DLT registered) only reaches Indian numbers.
    sms: true,
    otpChannel: "both",
    weightUnit: "kg",
    postal: { label: "PIN code", pattern: "^[1-9][0-9]{5}$" },
    region: "State",
    bank: ["accountNumber", "ifsc"],
    legalPages: ["privacy", "refund", "terms", "shipping"],
  },
  US: {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    home: true,
    currency: "USD",
    timezone: "America/New_York",
    locale: "en-US",
    language: "en",
    dialCode: "1",
    tax: { system: "sales_tax", label: "Sales tax", inclusive: false },
    gateways: ["stripe", "paypal"],
    cod: false,
    sms: false,
    otpChannel: "whatsapp",
    weightUnit: "lb",
    postal: { label: "ZIP code", pattern: "^\\d{5}(-\\d{4})?$" },
    region: "State",
    bank: ["routingNumber", "accountNumber"],
    legalPages: ["privacy", "refund", "terms", "shipping"],
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    home: true,
    currency: "GBP",
    timezone: "Europe/London",
    locale: "en-GB",
    language: "en",
    dialCode: "44",
    tax: { system: "vat", label: "VAT", inclusive: true, standardRate: 20 },
    gateways: ["stripe", "paypal"],
    cod: false,
    sms: false,
    otpChannel: "whatsapp",
    weightUnit: "kg",
    postal: { label: "Postcode", pattern: "^[A-Za-z]{1,2}\\d[A-Za-z\\d]?\\s?\\d[A-Za-z]{2}$" },
    region: "County",
    bank: ["sortCode", "accountNumber"],
    legalPages: ["privacy", "refund", "terms", "shipping"],
  },
  DE: {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    home: true,
    currency: "EUR",
    timezone: "Europe/Berlin",
    locale: "de-DE",
    language: "de",
    dialCode: "49",
    tax: { system: "vat", label: "MwSt.", inclusive: true, standardRate: 19, reducedRate: 7 },
    gateways: ["stripe", "paypal"],
    cod: false,
    sms: false,
    otpChannel: "whatsapp",
    weightUnit: "kg",
    postal: { label: "Postleitzahl", pattern: "^\\d{5}$" },
    region: "Bundesland",
    bank: ["iban", "bic"],
    // Impressum and the 14-day withdrawal notice are required by law.
    legalPages: ["imprint", "privacy", "withdrawal", "terms", "shipping"],
  },
  FR: {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    home: true,
    currency: "EUR",
    timezone: "Europe/Paris",
    locale: "fr-FR",
    language: "fr",
    dialCode: "33",
    tax: { system: "vat", label: "TVA", inclusive: true, standardRate: 20, reducedRate: 5.5 },
    gateways: ["stripe", "paypal"],
    cod: false,
    sms: false,
    otpChannel: "whatsapp",
    weightUnit: "kg",
    postal: { label: "Code postal", pattern: "^\\d{5}$" },
    region: "Région",
    bank: ["iban", "bic"],
    // Mentions légales and the 14-day withdrawal notice are required by law.
    legalPages: ["imprint", "privacy", "withdrawal", "terms", "shipping"],
  },
  JP: {
    code: "JP",
    name: "Japan",
    flag: "🇯🇵",
    home: true,
    currency: "JPY",
    timezone: "Asia/Tokyo",
    locale: "ja-JP",
    language: "ja",
    dialCode: "81",
    tax: { system: "consumption", label: "消費税", inclusive: true, standardRate: 10, reducedRate: 8 },
    gateways: ["stripe", "paypal"],
    cod: false,
    sms: false,
    otpChannel: "whatsapp",
    weightUnit: "kg",
    postal: { label: "郵便番号", pattern: "^\\d{3}-?\\d{4}$" },
    region: "Prefecture",
    bank: ["bankCode", "branchCode", "accountNumber"],
    // 特定商取引法に基づく表記 (Specified Commercial Transactions) is required.
    legalPages: ["commerce-disclosure", "privacy", "refund", "terms", "shipping"],
  },
  SA: {
    code: "SA",
    name: "Saudi Arabia",
    flag: "🇸🇦",
    home: false,
    currency: "SAR",
    timezone: "Asia/Riyadh",
    locale: "ar-SA",
    language: "ar",
    dialCode: "966",
  },
  CN: {
    code: "CN",
    name: "China",
    flag: "🇨🇳",
    home: false,
    currency: "CNY",
    timezone: "Asia/Shanghai",
    locale: "zh-CN",
    language: "zh",
    dialCode: "86",
  },
};

/** Apps that only work for businesses in India (UPI, GST filing, Indian couriers). */
const INDIA_ONLY_APPS = ["upi-qr", "gst-returns", "shiprocket", "ithink-logistics"];

/** A store's country; stores from before countries existed are India. */
function countryOf(storeOrCode) {
  const code = typeof storeOrCode === "string" ? storeOrCode : storeOrCode?.homeCountry;
  return COUNTRIES[String(code || "IN").toUpperCase()] || COUNTRIES.IN;
}

/** The countries a new store can be registered in, for the sign-up picker. */
function homeCountries() {
  return Object.values(COUNTRIES)
    .filter((c) => c.home)
    .map(({ code, name, flag, currency, dialCode }) => ({ code, name, flag, currency, dialCode }));
}

/** Can this store use this app? */
function appAllowed(storeOrCode, appKey) {
  return countryOf(storeOrCode).code === "IN" || !INDIA_ONLY_APPS.includes(appKey);
}

// How money reads in each currency when the store's own locale isn't known.
const CURRENCY_LOCALE = { INR: "en-IN", USD: "en-US", GBP: "en-GB", EUR: "de-DE", JPY: "ja-JP", CNY: "zh-CN", SAR: "en-SA" };

module.exports = { COUNTRIES, INDIA_ONLY_APPS, countryOf, homeCountries, appAllowed, CURRENCY_LOCALE };
