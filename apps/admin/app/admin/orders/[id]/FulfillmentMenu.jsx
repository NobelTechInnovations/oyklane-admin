"use client";

import { useState } from "react";
import { Button, Dropdown } from "antd";
import { ChevronDown, ClipboardList, PackageCheck, Truck } from "lucide-react";
import { ShipWithOyklane } from "./OyklaneShipping";
import { ShipWithCourierApp, useCourierApps } from "./CourierAppShipping";

/**
 * The order's one "Fulfillment" button: ship with Oyklane Shipping, with an
 * installed courier app (Shiprocket), or add tracking details yourself
 * (the default — what the button does when its main part is pressed).
 */
export function FulfillmentMenu({ order, onTracking, onBooked }) {
  const apps = useCourierApps();
  const [open, setOpen] = useState(null); // "oyklane" | app key
  const items = [
    { key: "oyklane", icon: <PackageCheck size={15} aria-hidden="true" />, label: "Ship with Oyklane Shipping" },
    ...apps.map((a) => ({ key: a.key, icon: <Truck size={15} aria-hidden="true" />, label: `Ship with ${a.name}` })),
    { type: "divider" },
    { key: "tracking", icon: <ClipboardList size={15} aria-hidden="true" />, label: "Add tracking details" },
  ];
  return (
    <>
      <Dropdown.Button
        type="primary"
        trigger={["click"]}
        placement="bottomRight"
        icon={<ChevronDown size={15} aria-hidden="true" />}
        onClick={onTracking}
        menu={{ items, onClick: ({ key }) => (key === "tracking" ? onTracking() : setOpen(key)) }}
      >
        <Truck size={15} aria-hidden="true" className="mr-1.5 inline -mt-0.5" />
        Fulfillment
      </Dropdown.Button>
      <ShipWithOyklane order={order} open={open === "oyklane"} onClose={() => setOpen(null)} onBooked={onBooked} />
      {apps.map((a) => (
        <ShipWithCourierApp key={a.key} app={a} order={order} open={open === a.key} onClose={() => setOpen(null)} onBooked={onBooked} />
      ))}
    </>
  );
}
