import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Button from "./Button";
export function FilterBar({ items, values, onChange, onClear, style, }) {
    return (_jsxs("div", { className: "toolbar", style: { gap: 8, flexWrap: "wrap", ...style }, children: [items.map((it) => {
                if (it.type === "text") {
                    return (_jsx("input", { placeholder: it.placeholder || "Search…", value: values[it.key] || "", onChange: (e) => onChange(it.key, e.target.value) }, it.key));
                }
                if (it.type === "select") {
                    return (_jsx("select", { value: values[it.key] || "", onChange: (e) => onChange(it.key, e.target.value), children: it.options.map((o) => (_jsx("option", { value: o.value, children: o.label }, o.value))) }, it.key));
                }
                return (_jsx("input", { type: "date", value: values[it.key] || "", onChange: (e) => onChange(it.key, e.target.value) }, it.key));
            }), onClear && (_jsx(Button, { onClick: onClear, size: "sm", children: "Clear" }))] }));
}
export default FilterBar;
