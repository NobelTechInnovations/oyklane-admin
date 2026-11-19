import { ShippingSettings, DutiesSettings } from "../ShippingSettings";
import { OyklaneShippingSettings } from "../OyklaneShippingSettings";
import { StorePickup } from "../StorePickup";
import { LocalDelivery } from "../LocalDelivery";
import { SettingsSectionHeader } from "../SettingsNav";

export default function SettingsShippingPage() {
  return (
    <div>
      <SettingsSectionHeader title="Shipping" description="Couriers, pickup addresses and what shoppers pay for delivery at checkout." />
      <OyklaneShippingSettings
        checkout={
          <div className="flex flex-col gap-5">
            <ShippingSettings />
            <DutiesSettings />
            <StorePickup />
            <LocalDelivery />
          </div>
        }
      />
    </div>
  );
}
