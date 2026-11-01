import { ShippingSettings } from "../ShippingSettings";
import { OyklaneShippingSettings } from "../OyklaneShippingSettings";
import { StorePickup } from "../StorePickup";
import { SettingsSectionHeader } from "../SettingsNav";

export default function SettingsShippingPage() {
  return (
    <div>
      <SettingsSectionHeader title="Shipping" description="Couriers, pickup addresses and what shoppers pay for delivery at checkout." />
      <OyklaneShippingSettings
        checkout={
          <div className="flex flex-col gap-5">
            <ShippingSettings />
            <StorePickup />
          </div>
        }
      />
    </div>
  );
}
