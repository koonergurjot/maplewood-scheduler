import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function Toast({ open, message, actionLabel, onAction }) {
    if (!open)
        return null;
    return (_jsxs("div", { role: "status", className: "toast", "data-testid": "undo-delete-toast", style: {
            position: "fixed",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#333",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: 4,
            display: "flex",
            gap: 8,
            alignItems: "center",
        }, children: [_jsx("span", { children: message }), actionLabel && onAction && (_jsx("button", { className: "btn btn-sm", onClick: onAction, children: actionLabel }))] }));
}
