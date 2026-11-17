import { serverApiFetch } from "@/lib/api";
import { SettingsSectionHeader } from "../SettingsNav";
import { MarketsSettings } from "./MarketsSettings";

export default async function SettingsMarketsPage() {
  const [{ role }, markets] = await Promise.all([serverApiFetch("/api/store"), serverApiFetch("/api/store/markets")]);
  return (
    <div>
      <SettingsSectionHeader
        title="Markets and languages"
        description={`Show your store in your shoppers' own currencies and languages. Your store's currency is ${markets.base}.`}
      />
      <MarketsSettings initial={markets} canEdit={role !== "staff"} />
    </div>
  );
}
