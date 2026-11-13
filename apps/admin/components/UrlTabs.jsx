"use client";

import { Tabs } from "antd";
import { useUrlState } from "@/lib/useUrlState";

/** antd Tabs whose open tab is kept in the address (?{param}=key), so a
 * refresh or a shared link reopens it. Use a different `param` for tabs
 * inside tabs ("view", "sub"…). */
export function UrlTabs({ param = "tab", items = [], defaultActiveKey, onChange, ...rest }) {
  const keys = items.filter(Boolean).map((i) => String(i.key));
  const [active, setActive] = useUrlState(param, defaultActiveKey || keys[0], keys);
  return (
    <Tabs
      {...rest}
      items={items}
      activeKey={keys.includes(active) ? active : keys[0]}
      onChange={(k) => {
        setActive(k);
        onChange?.(k);
      }}
    />
  );
}
