import { serverApiFetch } from "@/lib/api";
import { SettingsSectionHeader } from "../SettingsNav";
import { CustomDataSettings } from "./CustomDataSettings";
import { ProductSectionsCard } from "./ProductSectionsCard";

export default async function SettingsCustomDataPage() {
  const [{ role, store }, products, collections] = await Promise.all([
    serverApiFetch("/api/store"),
    serverApiFetch("/api/metafields?owner=product"),
    serverApiFetch("/api/metafields?owner=collection"),
  ]);
  return (
    <div>
      <SettingsSectionHeader
        title="Custom data"
        description="Choose the sections your product pages need, and add your own fields to products and collections — Fabric, Fit, Care instructions, a Size chart."
      />
      <ProductSectionsCard initial={store?.settings?.productSections || {}} canEdit={role !== "staff"} />
      <CustomDataSettings
        types={products.types}
        initial={{ product: products.definitions, collection: collections.definitions }}
        canEdit={role !== "staff"}
      />
    </div>
  );
}
