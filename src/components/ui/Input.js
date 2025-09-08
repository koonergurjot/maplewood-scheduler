import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Input({ label, hint, error, style, ...rest }) {
    return (_jsxs("div", { style: { display: "grid", gap: 4 }, children: [label && _jsx("label", { children: label }), _jsx("input", { ...rest, style: {
                    width: "100%",
                    background: "var(--cardAlt)",
                    border: `1px solid ${error ? "var(--bad)" : "var(--stroke)"}`,
                    borderRadius: 10,
                    padding: 10,
                    color: "var(--text)",
                    ...style,
                } }), hint && !error && (_jsx("div", { className: "subtitle", style: { fontSize: 12 }, children: hint })), error && (_jsx("div", { className: "bad", style: { fontSize: 12 }, children: error }))] }));
}
export default Input;
