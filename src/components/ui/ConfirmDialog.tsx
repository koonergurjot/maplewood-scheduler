import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  title: string;
  body: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  body,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && cancelRef.current) {
      cancelRef.current.focus();
    }
  }, [open]);

  // Add keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      data-testid="confirm-delete-modal"
    >
      <h2>{title}</h2>
      <p>{body}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button ref={cancelRef} onClick={onCancel}>
          Cancel
        </button>
        <button className="btn danger" onClick={onConfirm}>
          Delete
        </button>
      </div>
    </div>
  );
}
