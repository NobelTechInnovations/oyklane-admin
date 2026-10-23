import { ShippingSettings } from "../ShippingSettings";
import { OyklaneShippingSettings } from "../OyklaneShippingSettings";
import { SettingsSectionHeader } from "../SettingsNav";

export default function SettingsShippingPage() {
  return (
    <div>
      <SettingsSectionHeader
        title="Shipping"
        description="Where you deliver and what shoppers pay for it. The matching rate is added at checkout."
      />
      <OyklaneShippingSettings />
      <h3 className="text-[15px] font-semibold text-ink mt-8 mb-3">Delivery charges at checkout</h3>
      <ShippingSettings />
    </div>
  );
}
