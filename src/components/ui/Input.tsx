import React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Input({ label, hint, error, style, ...rest }: InputProps) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {label && <label>{label}</label>}
      <input
        {...rest}
        style={{
          width: "100%",
          background: "var(--cardAlt)",
          border: `1px solid ${error ? "var(--bad)" : "var(--stroke)"}`,
          borderRadius: 10,
          padding: 10,
          color: "var(--text)",
          ...style,
        }}
      />
      {hint && !error && (
        <div className="subtitle" style={{ fontSize: 12 }}>{hint}</div>
      )}
      {error && (
        <div className="bad" style={{ fontSize: 12 }}>{error}</div>
      )}
    </div>
  );
}

export default Input;

