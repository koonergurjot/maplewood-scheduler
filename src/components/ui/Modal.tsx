import React, { useEffect } from "react";

export function Modal({ open, title, children, onClose, footer }: { open: boolean; title?: string; children: React.ReactNode; onClose: () => void; footer?: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: "min(680px, 96vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-h" style={{ fontWeight: 800 }}>{title}</div>
        <div className="card-c">{children}</div>
        {footer && <div className="card-c" style={{ display: "flex", justifyContent: "flex-end" }}>{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;

