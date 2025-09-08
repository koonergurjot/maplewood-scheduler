import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
export default function ConfirmDialog({ open, title, body, onConfirm, onCancel, }) {
    const cancelRef = useRef(null);
    useEffect(() => {
        if (open && cancelRef.current) {
            cancelRef.current.focus();
        }
    }, [open]);
    // Add keyboard shortcuts
    useEffect(() => {
        if (!open)
            return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
            }
            else if (e.key === "Enter") {
                e.preventDefault();
                onConfirm();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, onCancel, onConfirm]);
    if (!open)
        return null;
    return (_jsxs("div", { className: "modal", role: "dialog", "aria-modal": "true", "data-testid": "confirm-delete-modal", children: [_jsx("h2", { children: title }), _jsx("p", { children: body }), _jsxs("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" }, children: [_jsx("button", { ref: cancelRef, onClick: onCancel, children: "Cancel" }), _jsx("button", { className: "btn danger", onClick: onConfirm, children: "Delete" })] })] }));
}
