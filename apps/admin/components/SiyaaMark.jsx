"use client";

import { useId } from "react";

/** Siyaa AI's mark: a saffron-to-rose tile with an "S" and a bindi dot.
 * Used in the sidebar, the assistant page and wherever Siyaa speaks. */
export default function SiyaaMark({ size = 32, className = "" }) {
  const id = `sy${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={id} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFB547" />
          <stop offset="0.55" stopColor="#F47A3D" />
          <stop offset="1" stopColor="#DE3F5B" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="10" fill={`url(#${id})`} />
      <path
        d="M20.6 11.2c-1.1-1.1-2.7-1.7-4.5-1.7-2.7 0-4.6 1.4-4.6 3.4 0 4.6 9.6 2.6 9.6 6.8 0 2-1.9 3.4-4.8 3.4-1.9 0-3.6-.7-4.9-1.9"
        fill="none"
        stroke="#fff"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <circle cx="23.4" cy="8.6" r="1.7" fill="#fff" />
    </svg>
  );
}
