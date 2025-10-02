import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type EditableSelectOption = { value: string; label: ReactNode };

export type EditableSelectProps = {
  value: string;
  options: EditableSelectOption[];
  onSave: (next: string) => void;
  placeholder?: string;
  renderPreview?: (option: EditableSelectOption | null) => ReactNode;
  className?: string;
  style?: CSSProperties;
  selectProps?: Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    "value" | "onChange" | "onBlur" | "onKeyDown"
  >;
  disabled?: boolean;
};

export default function EditableSelect({
  value,
  options,
  onSave,
  placeholder,
  renderPreview,
  className,
  style,
  selectProps,
  disabled,
}: EditableSelectProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const selectRef = useRef<HTMLSelectElement>(null);
  const pendingActionRef = useRef<"save" | "cancel" | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      const frame = requestAnimationFrame(() => {
        const select = selectRef.current;
        if (select) {
          select.focus();
        }
      });
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [isEditing]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const previewContent = useMemo(() => {
    if (renderPreview) {
      return renderPreview(selectedOption);
    }
    if (!selectedOption && placeholder) {
      return (
        <span style={{ color: "var(--muted)", fontStyle: "italic" }}>
          {placeholder}
        </span>
      );
    }
    return selectedOption?.label ?? "—";
  }, [placeholder, renderPreview, selectedOption]);

  const commit = (nextValue: string) => {
    pendingActionRef.current = "save";
    setIsEditing(false);
    if (nextValue !== value) {
      onSave(nextValue);
    }
  };

  const cancel = () => {
    pendingActionRef.current = "cancel";
    setDraft(value);
    setIsEditing(false);
  };

  const handleBlur = () => {
    if (pendingActionRef.current) {
      pendingActionRef.current = null;
      return;
    }
    commit(draft);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSelectElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit((event.target as HTMLSelectElement).value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };

  const triggerEdit = () => {
    if (disabled) return;
    setDraft(value);
    setIsEditing(true);
  };

  const buttonStyle: CSSProperties = {
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: 8,
    padding: "4px 8px",
    minHeight: 32,
    color: "var(--text)",
    cursor: disabled ? "not-allowed" : "pointer",
  };

  const selectStyle: CSSProperties = {
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
        <select
          {...selectProps}
          ref={selectRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{ ...selectStyle, ...selectProps?.style }}
          disabled={disabled}
        >
          {options.map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <button
          type="button"
          onClick={triggerEdit}
          style={buttonStyle}
          disabled={disabled}
        >
          {previewContent}
        </button>
      )}
    </div>
  );
}
