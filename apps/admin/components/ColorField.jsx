"use client";

import { ColorPicker } from "antd";

/**
 * A colour setting: a swatch that opens a picker (with a hex box and a few
 * presets). Works as a Form.Item child — `value` is "#rrggbb" or empty.
 */
export function ColorField({ value, onChange, placeholder = "#111111", allowClear = true, disabled }) {
  return (
    <ColorPicker
      value={value || null}
      onChange={(c) => onChange?.(c ? c.toHexString() : "")}
      onClear={() => onChange?.("")}
      allowClear={allowClear}
      disabled={disabled}
      showText={(c) => <span className="text-[13px] tabular-nums">{value ? c.toHexString().toUpperCase() : `Default (${placeholder.toUpperCase()})`}</span>}
      disabledAlpha
      format="hex"
      presets={[{ label: "Suggested", colors: ["#111111", "#E11D48", "#DB2777", "#7C3AED", "#2563EB", "#0891B2", "#16A34A", "#CA8A04", "#EA580C", "#B91C1C"] }]}
    />
  );
}
