"use client";

import Link from "next/link";
import { Collapse, Drawer } from "antd";
import { useEditorStore } from "./store";
import { SettingField } from "./SettingField";

// Stored with the theme's settings; the storefront prints it last in <head>.
const CUSTOM_CSS = { type: "css", id: "custom_css" };

function GroupFields({ group, settingsData, updateThemeSetting, products, collections, menus }) {
  return group.settings.map((setting, i) =>
    setting.type === "paragraph" ? (
      <p key={`p-${i}`} className="text-xs text-ink-muted -mt-1 mb-3">{setting.content}</p>
    ) : setting.type === "header" ? (
      <div key={`h-${i}`} className="text-xs font-semibold text-ink mt-4 mb-2">{setting.content}</div>
    ) : (
      <div key={setting.id} className="mb-3">
        <label className="block text-xs font-medium text-ink-muted mb-1">{setting.label}</label>
        <SettingField setting={setting} value={settingsData[setting.id] ?? setting.default} products={products} collections={collections} menus={menus} onChange={(value) => updateThemeSetting(setting.id, value)} />
        {setting.info && <p className="text-[11px] text-ink-muted mt-1 mb-0">{setting.info}</p>}
      </div>
    )
  );
}

/** Theme settings as collapsible groups (Colours, Typography, Layout,
 * Product cards …) — the left panel's second tab, like Shopify's. */
export function ThemeSettingsPanel({ schemaGroups, products, collections, menus }) {
  const settingsData = useEditorStore((s) => s.settingsData);
  const updateThemeSetting = useEditorStore((s) => s.updateThemeSetting);
  const items = [
    ...schemaGroups.map((group) => ({
      key: group.name,
      label: <span className="text-[13px] font-medium">{group.name}</span>,
      children: <GroupFields group={group} settingsData={settingsData} updateThemeSetting={updateThemeSetting} products={products} collections={collections} menus={menus} />,
    })),
    {
      key: "custom-css",
      label: <span className="text-[13px] font-medium">Custom CSS</span>,
      children: (
        <>
          <p className="text-xs text-ink-muted mt-0 mb-3">Your own styles for every page. Loaded after the theme&apos;s, so they win.</p>
          <SettingField setting={CUSTOM_CSS} value={settingsData.custom_css || ""} onChange={(value) => updateThemeSetting("custom_css", value)} />
        </>
      ),
    },
  ];
  return (
    <div className="h-full overflow-y-auto">
      <p className="px-4 pt-4 pb-2 m-0 text-[14px] font-semibold text-ink">Theme settings</p>
      <Collapse ghost accordion expandIconPosition="end" items={items} className="oy-ts" />
    </div>
  );
}

/** App embeds: what installed apps add to every page. */
export function AppEmbedsPanel() {
  const rows = [
    { name: "Support chat", note: "AI chat bubble on every page (Growth and Pro)", href: "/admin/settings/support-chat" },
    { name: "Phone Login popup", note: "Sign-in popup, when and where it opens", href: "/admin/apps/details/phone-login" },
    { name: "Shoppable Videos", note: "Floating video bubble", href: "/admin/apps/shoppable-videos" },
    { name: "Product reviews", note: "Stars on product cards", href: "/admin/apps/reviews" },
  ];
  return (
    <div className="h-full overflow-y-auto">
      <p className="px-4 pt-4 pb-1 m-0 text-[14px] font-semibold text-ink">App embeds</p>
      <p className="px-4 m-0 mb-3 text-[12px] text-ink-muted">Apps that add something to every page. Apps with their own block (Google reviews, Bundle builder, Shoppable videos) are under Sections ▸ Add section ▸ Apps.</p>
      <ul className="list-none m-0 px-2 pb-4">
        {rows.map((r) => (
          <li key={r.name}>
            <Link href={r.href} target="_blank" className="flex flex-col rounded-lg px-2 py-2.5 no-underline hover:bg-app-bg">
              <span className="text-[13px] font-medium text-ink">{r.name}</span>
              <span className="text-[12px] text-ink-muted">{r.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ThemeSettingsDrawer({ open, onClose, schemaGroups, products, collections, menus }) {
  return (
    <Drawer title="Theme settings" open={open} onClose={onClose} width={360} styles={{ body: { padding: 0 } }}>
      <ThemeSettingsPanel schemaGroups={schemaGroups} products={products} collections={collections} menus={menus} />
    </Drawer>
  );
}
