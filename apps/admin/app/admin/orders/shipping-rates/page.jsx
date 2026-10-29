import { redirect } from "next/navigation";

/** Moved to Shipping ▸ Rates. */
export default function OldShippingRates() {
  redirect("/admin/shipping/rates");
}
