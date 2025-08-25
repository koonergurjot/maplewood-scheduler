import { useState } from "react";
import type { Employee, Vacancy } from "../App";
import { OVERRIDE_REASONS } from "../App";

type Props = {
  open: boolean;
  employees: Employee[];
  vacancies: Vacancy[];
  onConfirm: (
    payload: {
      empId?: string;
      reason?: string;
      overrideUsed?: boolean;
      message?: string;
    },
  ) => void;
  onClose: () => void;
};

export default function BulkAwardDialog({
  open,
  employees,
  vacancies,
  onConfirm,
  onClose,
}: Props) {
  const [empId, setEmpId] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [allowOverride, setAllowOverride] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const confirm = () => {
    setError("");
    const chosen = employees.find((e) => e.id === empId);
    if (!chosen) return;
    const classMismatch = vacancies.some(
      (v) => v.classification !== chosen.classification,
    );
    if (classMismatch && !allowOverride) {
      setError(
        'Selected employee classification does not match vacancy classification. Check "Allow class override" to proceed.',
      );
      return;
    }
    if (allowOverride && !reason) {
      setError("Please select an override reason.");
      return;
    }
    onConfirm({
      empId: empId || undefined,
      reason: allowOverride ? reason : undefined,
      overrideUsed: allowOverride,
      message: message || undefined,
    });
    setEmpId("");
    setMessage("");
    setReason("");
    setAllowOverride(false);
  };

  return (
    <div role="alertdialog" aria-modal="true" className="modal">
      <h3>Bulk Award Vacancies</h3>
      <label>
        Employee
        <select value={empId} onChange={(e) => setEmpId(e.target.value)}>
          <option value="">Select employee…</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.firstName} {e.lastName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Message (optional)
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      <label>
        <input
          type="checkbox"
          checked={allowOverride}
          onChange={(e) => setAllowOverride(e.target.checked)}
        />
        Allow class override
      </label>
      {allowOverride && (
        <label>
          Override reason
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Select reason…</option>
            {OVERRIDE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && (
        <p role="alert" style={{ color: "red" }}>
          {error}
        </p>
      )}
      <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn" onClick={confirm} disabled={!empId}>
          Confirm
        </button>
      </div>
    </div>
  );
}
