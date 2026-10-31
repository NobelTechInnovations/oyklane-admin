"use client";

import { Shipments } from "@/components/shipping/Shipments";

/** Shipping ▸ Failed deliveries (NDR): parcels the courier couldn't
 * deliver — re-attempt (another day, new phone or address) or return. */
export default function NdrPage() {
  return <Shipments initialTab="ndr" title="Failed deliveries (NDR)" subtitle="Parcels the courier couldn't deliver. Choose to try again — on another day, with a new phone or address — or to have it returned to you." />;
}
