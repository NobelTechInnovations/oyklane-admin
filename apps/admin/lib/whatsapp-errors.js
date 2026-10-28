/**
 * WhatsApp's failure text, made readable: known Meta errors get a plain
 * reason and fix, and a Meta link it carries becomes a button instead of a
 * long URL.
 */
export function deliveryProblem(error) {
  const raw = String(error || "");
  const link = (raw.match(/https:\/\/business\.facebook\.com\/\S+/) || [])[0]?.replace(/[.,)]+$/, "") || null;
  if (/payment method|eligibility payment/i.test(raw)) return { text: "Your WhatsApp Business account has no working payment method in Meta, so Meta didn't send it. Add one in Meta Business ▸ Billing.", link };
  if (/healthy ecosystem|ecosystem engagement|131049/i.test(raw)) return { text: "Meta held back this marketing message: it limits how many marketing messages one person gets, especially if they haven't replied lately. It isn't a problem with your account — try again in a few days, or send a utility message (orders, updates).", link: null };
  if (/re-?engagement|24 hours|outside.*window|131047/i.test(raw)) return { text: "It's been more than 24 hours since this customer messaged you, so WhatsApp only allows an approved template.", link };
  if (/not a valid whatsapp|not on whatsapp|131026|undeliverable/i.test(raw)) return { text: "This number can't receive WhatsApp messages (not on WhatsApp, or an old app version).", link: null };
  return { text: raw.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").replace(/\s*Visit\s*to resolve this issue\.?/i, "").trim(), link };
}
