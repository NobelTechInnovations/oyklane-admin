const { z } = require("zod");

// Optional WhatsApp number at sign-up → "+91XXXXXXXXXX" (an Indian mobile,
// with or without 0 / 91 / +91) or "+<country><number>"; blank → undefined.
const whatsapp = z
  .string()
  .max(24)
  .optional()
  .transform((v, ctx) => {
    const raw = String(v || "").replace(/[\s().-]/g, "");
    if (!raw) return undefined;
    const digits = raw.replace(/^\+/, "");
    if (/^\d+$/.test(digits)) {
      if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
      if (/^0[6-9]\d{9}$/.test(digits)) return `+91${digits.slice(1)}`;
      if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
      if (raw.startsWith("+") && digits.length >= 8 && digits.length <= 15) return raw;
    }
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid WhatsApp number" });
    return z.NEVER;
  });

const registerSchema = z.object({
  name: z.string().min(2, "Name is too short").max(120),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  storeName: z.string().min(2, "Store name is too short").max(120),
  // The plan's key (starter / growth / pro). Optional: a store created
  // without one picks it on its first visit to the dashboard (/welcome).
  plan: z.string().trim().min(1).max(40).optional(),
  whatsapp,
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const createStoreSchema = z.object({
  storeName: z.string().min(2, "Store name is too short").max(120),
  plan: z.string().trim().min(1).max(40).optional(),
  whatsapp,
});

const switchStoreSchema = z.object({
  storeId: z.string().min(1),
});

module.exports = { registerSchema, loginSchema, createStoreSchema, switchStoreSchema };
