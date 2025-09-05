import { useEffect } from "react";

export function useFocusTrap(ref: React.RefObject<HTMLElement>, onEscape?: () => void) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const focusable = node.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1] || first;
    // Focus first interactive element
    (first || node).focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Tab") {
        if (focusable.length === 0) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      } else if (e.key === "Escape") {
        onEscape?.();
      }
    }

    node.addEventListener("keydown", onKey);
    return () => node.removeEventListener("keydown", onKey);
  }, [ref, onEscape]);
}