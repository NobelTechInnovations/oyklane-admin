"use client";

import { useEffect, useState } from "react";
import { Button, Checkbox, Popover } from "antd";
import { Columns3 } from "lucide-react";

/**
 * Which columns a list shows, picked from a "Columns" button and
 * remembered in this browser. `options` are the columns that can be turned
 * on or off ({ key, label, default }); columns not listed always show.
 * Tag a table column with `choice: "<key>"` and pass the list through
 * `pick(columns)`.
 */
export function useColumnChoice(storageKey, options) {
  const defaults = options.filter((o) => o.default !== false).map((o) => o.key);
  const [shown, setShown] = useState(defaults);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(saved)) setShown(saved.filter((k) => options.some((o) => o.key === k)));
    } catch {
      /* private mode: defaults */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const save = (next) => {
    setShown(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const toggle = (key, on) => save(on ? options.map((o) => o.key).filter((k) => k === key || shown.includes(k)) : shown.filter((k) => k !== key));

  const picker = (
    <Popover
      trigger="click"
      placement="bottomRight"
      title="Columns"
      content={
        <div className="flex min-w-[200px] flex-col gap-1.5">
          {options.map((o) => (
            <Checkbox key={o.key} checked={shown.includes(o.key)} onChange={(e) => toggle(o.key, e.target.checked)}>
              {o.label}
            </Checkbox>
          ))}
          <Button size="small" type="link" className="mt-1 self-start !px-0" onClick={() => save(defaults)}>
            Reset to default
          </Button>
        </div>
      }
    >
      <Button icon={<Columns3 size={14} aria-hidden="true" />} aria-label="Choose columns">
        <span className="hidden sm:inline">Columns</span>
      </Button>
    </Popover>
  );

  // eslint-disable-next-line no-unused-vars
  const pick = (columns) => columns.filter((c) => !c.choice || shown.includes(c.choice)).map(({ choice, ...c }) => c);
  return { shown, picker, pick };
}
