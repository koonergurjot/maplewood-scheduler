import { jsx as _jsx } from "react/jsx-runtime";
const variantToStyle = {
    primary: { background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" },
    secondary: { background: "var(--cardAlt)", color: "var(--text)", borderColor: "var(--stroke)" },
    destructive: { background: "var(--bad)", color: "#fff", borderColor: "var(--bad)" },
    ghost: { background: "transparent", color: "var(--text)", borderColor: "var(--stroke)" },
};
const sizeToPadding = {
    sm: "4px 8px",
    md: "9px 12px",
    lg: "12px 16px",
};
export function Button({ variant = "secondary", size = "md", style, className, type = "button", ...rest }) {
    return (_jsx("button", { className: `btn${size === "sm" ? " btn-sm" : ""}${className ? ` ${className}` : ""}`, style: {
            border: "1px solid",
            borderRadius: 12,
            padding: sizeToPadding[size],
            fontWeight: 700,
            transition: "background .2s,transform .2s,box-shadow .2s",
            ...variantToStyle[variant],
            ...style,
        }, type: type, ...rest }));
}
export default Button;
