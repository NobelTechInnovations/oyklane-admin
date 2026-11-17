import { serverApiFetch } from "@/lib/api";
import { SettingsSectionHeader } from "../SettingsNav";
import { MarketsSettings } from "./MarketsSettings";

export default async function SettingsMarketsPage() {
  const [{ role }, markets] = await Promise.all([serverApiFetch("/api/store"), serverApiFetch("/api/store/markets")]);
  return (
    <div>
      <SettingsSectionHeader
        title="Markets and currencies"
        description={`Show prices in your shoppers' own currencies. Checkout still charges in ${markets.base}, your store's currency.`}
      />
      <MarketsSettings initial={markets} canEdit={role !== "staff"} />
    </div>
  );
}
