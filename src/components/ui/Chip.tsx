import React from "react";

type ChipTone = "neutral" | "ok" | "warn" | "bad";

export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: ChipTone }) {
  const colorVar = tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : tone === "bad" ? "var(--bad)" : "var(--text)";
  return (
    <span
      className="pill"
      style={{
        display: "inline-block",
        border: "1px solid var(--stroke)",
        borderRadius: 999,
        padding: "4px 8px",
        fontSize: 12,
        fontWeight: 700,
        color: colorVar,
      }}
    >
      {children}
    </span>
  );
}

export default Chip;

