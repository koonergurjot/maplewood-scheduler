import React from "react";

export type StatusPillProps = React.HTMLAttributes<HTMLSpanElement> & {
  active: boolean;
  label?: string;
};

const formatLabel = (label: string | undefined, active: boolean) => {
  const trimmed = label?.trim();
  if (!trimmed) {
    return active ? "Active" : "Inactive";
  }

  return trimmed.replace(/\s+/g, " ");
};

const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ active, label, className = "", style, ...rest }, ref) => {
    const displayLabel = formatLabel(label, active);
    const accentColor = active ? "var(--ok)" : "var(--bad)";
    const backgroundTint = `color-mix(in srgb, ${accentColor} 18%, var(--card))`;
    const borderTint = `color-mix(in srgb, ${accentColor} 45%, transparent)`;

    return (
      <span
        ref={ref}
        className={`status-pill${className ? ` ${className}` : ""}`}
        data-active={active}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          color: accentColor,
          background: "var(--status-pill-bg, var(--chipBg))",
          border: "1px solid transparent",
          borderColor: "var(--status-pill-border, transparent)",
          flexShrink: 0,
          transition: "background-color .2s ease, color .2s ease, border-color .2s ease",
          ["--status-pill-bg" as any]: backgroundTint,
          ["--status-pill-border" as any]: borderTint,
          ["--status-pill-indicator" as any]: accentColor,
          ...style,
        }}
        {...rest}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--status-pill-indicator, currentColor)",
          }}
        />
        <span>{displayLabel}</span>
      </span>
    );
  },
);

StatusPill.displayName = "StatusPill";

export default StatusPill;
