import React, { useEffect, useRef } from "react";

export function Modal({ open, title, children, onClose, footer }: { open: boolean; title?: string; children: React.ReactNode; onClose: () => void; footer?: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        // focus trap
        const root = containerRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !root.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !root.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      setTimeout(() => {
        const root = containerRef.current;
        if (!root) return;
        const first = root.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        first?.focus();
      }, 0);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
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
        ref={containerRef}
      >
        <div className="card-h" id="modal-title" style={{ fontWeight: 800 }}>{title}</div>
        <div className="card-c">{children}</div>
        {footer && <div className="card-c" style={{ display: "flex", justifyContent: "flex-end" }}>{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;

