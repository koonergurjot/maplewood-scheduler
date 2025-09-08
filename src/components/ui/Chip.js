import { jsx as _jsx } from "react/jsx-runtime";
export function Chip({ children, tone = "neutral" }) {
    const colorVar = tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : tone === "bad" ? "var(--bad)" : "var(--text)";
    return (_jsx("span", { className: "pill", style: {
            display: "inline-block",
            border: "1px solid var(--stroke)",
            borderRadius: 999,
            padding: "4px 8px",
            fontSize: 12,
            fontWeight: 700,
            color: colorVar,
        }, children: children }));
}
export default Chip;
