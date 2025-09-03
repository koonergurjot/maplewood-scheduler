interface Props {
  open: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function Toast({ open, message, actionLabel, onAction }: Props) {
  if (!open) return null;
  return (
    <div
      role="status"
      className="toast"
      data-testid="undo-delete-toast"
      style={{
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
      }}
    >
      <span>{message}</span>
      {actionLabel && onAction && (
        <button className="btn btn-sm" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
