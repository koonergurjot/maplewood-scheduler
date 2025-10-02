import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type EditableTextProps = {
  value: string;
  onSave: (next: string) => void;
  placeholder?: string;
  renderPreview?: (value: string) => ReactNode;
  className?: string;
  style?: CSSProperties;
  inputProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "onBlur" | "onKeyDown"
  >;
  disabled?: boolean;
};

export default function EditableText({
  value,
  onSave,
  placeholder,
  renderPreview,
  className,
  style,
  inputProps,
  disabled,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingActionRef = useRef<"save" | "cancel" | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value ?? "");
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      const frame = requestAnimationFrame(() => {
        const input = inputRef.current;
        if (input) {
          input.focus();
          input.select();
        }
      });
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [isEditing]);

  const displayValue = useMemo(() => {
    if (renderPreview) {
      return renderPreview(value ?? "");
    }
    const trimmed = (value ?? "").trim();
    if (!trimmed && placeholder) {
      return (
        <span style={{ color: "var(--muted)", fontStyle: "italic" }}>
          {placeholder}
        </span>
      );
    }
    return trimmed || "—";
  }, [placeholder, renderPreview, value]);

  const commit = (nextValue: string) => {
    const normalized = nextValue;
    pendingActionRef.current = "save";
    setIsEditing(false);
    if (normalized !== value) {
      onSave(normalized);
    }
  };

  const cancel = () => {
    pendingActionRef.current = "cancel";
    setDraft(value ?? "");
    setIsEditing(false);
  };

  const handleBlur = () => {
    if (pendingActionRef.current) {
      pendingActionRef.current = null;
      return;
    }
    commit(draft);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };

  const triggerEdit = () => {
    if (disabled) return;
    setDraft(value ?? "");
    setIsEditing(true);
  };

  const baseButtonStyle: CSSProperties = {
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: 8,
    padding: "4px 8px",
    minHeight: 32,
    color: "var(--text)",
    cursor: disabled ? "not-allowed" : "text",
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    background: "var(--cardAlt)",
    border: "1px solid var(--stroke)",
    borderRadius: 8,
    padding: "4px 8px",
    minHeight: 32,
    color: "var(--text)",
  };

  return (
    <div className={className} style={style}>
      {isEditing ? (
        <input
          {...inputProps}
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{ ...inputStyle, ...inputProps?.style }}
        />
      ) : (
        <button
          type="button"
          onClick={triggerEdit}
          style={baseButtonStyle}
          disabled={disabled}
        >
          {displayValue}
        </button>
      )}
    </div>
  );
}
