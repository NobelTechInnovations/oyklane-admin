"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ConfigProvider, Drawer } from "antd";
import { Sidebar, SidebarNav } from "./Sidebar";
import { Topbar } from "./Topbar";
import { BillingBanner } from "./BillingBanner";
import { HelpProvider } from "./help/HelpDrawer";

// List pages that use the whole width, so every table column shows.
const WIDE = [/^\/admin\/(products|orders|customers)$/, /^\/admin\/orders\/(drafts|abandoned)$/, /^\/admin\/products\/(inventory|collections)$/, /\/bulk-edit$/];

/**
 * The admin frame: fixed sidebar on desktop; below `lg` the sidebar
 * becomes a drawer opened from the top bar's menu button, so a phone gets
 * the full screen width for the page itself. The drawer closes itself on
 * navigation — tapping a menu item should land you on the page, not leave
 * the menu covering it.
 */
export function AdminShell({ user, store, children }) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <HelpProvider user={user}>
      {/* Primary buttons in near-black, like premium commerce admins; links and
          focus stay Oyklane blue. */}
      <ConfigProvider theme={{ components: { Button: { colorPrimary: "#1A1A1A", colorPrimaryHover: "#303030", colorPrimaryActive: "#000000", primaryShadow: "none" } } }}>
      <div className="oy-admin flex min-h-screen">
        <Sidebar />
        <Drawer
          open={navOpen}
          onClose={() => setNavOpen(false)}
          placement="left"
          width={272}
          closable={false}
          styles={{ body: { padding: 0 } }}
          className="lg:hidden"
          aria-label="Main menu"
        >
          <div className="oy-side h-full">
            <SidebarNav />
          </div>
        </Drawer>
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar user={user} store={store} onOpenNav={() => setNavOpen(true)} />
          {/* The AI Assistant is a full-width, full-height workspace. */}
          <main className={pathname.startsWith("/admin/assistant") ? "flex-1 w-full min-w-0" : `oy-main flex-1 w-full mx-auto${WIDE.some((r) => r.test(pathname)) ? " oy-main--wide" : ""}`}>
            <BillingBanner />
            {children}
          </main>
        </div>
      </div>
      </ConfigProvider>
    </HelpProvider>
  );
}
