import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function EmptyState({ title, description, icon = "📋", action, className = "" }) {
    return (_jsxs("div", { className: `text-center py-8 px-4 ${className}`, children: [_jsx("div", { className: "text-4xl mb-4", role: "img", "aria-label": "Empty state icon", children: icon }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: title }), description && (_jsx("p", { className: "text-sm text-gray-500 mb-4", children: description })), action && (_jsx("button", { onClick: action.onClick, className: "btn", children: action.label }))] }));
}
