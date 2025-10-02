import type { CSSProperties, ReactNode } from "react";
import EditableSelect, {
  type EditableSelectOption,
} from "./EditableSelect";

export type EditableToggleProps = {
  value: boolean;
  onSave: (next: boolean) => void;
  labels?: { on: ReactNode; off: ReactNode };
  placeholder?: string;
  renderPreview?: (value: boolean) => ReactNode;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
};

export default function EditableToggle({
  value,
  onSave,
  labels,
  placeholder,
  renderPreview,
  className,
  style,
  disabled,
}: EditableToggleProps) {
  const optionTrue: EditableSelectOption = {
    value: "true",
    label: labels?.on ?? "Yes",
  };
  const optionFalse: EditableSelectOption = {
    value: "false",
    label: labels?.off ?? "No",
  };

  const options = [optionTrue, optionFalse];

  return (
    <EditableSelect
      value={value ? optionTrue.value : optionFalse.value}
      options={options}
      onSave={(next) => onSave(next === optionTrue.value)}
      placeholder={placeholder}
      renderPreview={(selected) => {
        const boolValue = selected?.value === optionTrue.value;
        if (renderPreview) {
          return renderPreview(boolValue);
        }
        return boolValue ? optionTrue.label : optionFalse.label;
      }}
      className={className}
      style={style}
      disabled={disabled}
    />
  );
}
