import { useState } from "react";
import type { Employee, Vacancy } from "../types";
import { OVERRIDE_REASONS } from "../types";
import { logBulkAward } from "../utils/logger";

type Props = {
  open: boolean;
  employees: Employee[];
  vacancies: Vacancy[];
  onConfirm: (payload: { empId?: string; reason?: string; overrideUsed?: boolean; message?: string }) => void;
  onClose: () => void;
};

export default function BulkAwardDialog({ open, employees, vacancies, onConfirm, onClose }: Props) {
  const [empId, setEmpId] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const confirm = async () => {
    const payload = {
      empId: empId || undefined,
      reason: reason || undefined,
      overrideUsed: !!reason,
      message: message || undefined,
    };
    onConfirm(payload);
    try {
      await logBulkAward({
        vacancyIds: vacancies.map((v) => v.id),
        employeeId: payload.empId,
        reason: payload.reason,
      });
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to log bulk award");
    }
    setEmpId("");
    setMessage("");
    setReason("");
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
        Override reason
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">None</option>
          {OVERRIDE_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn" onClick={confirm} disabled={!empId}>
          Confirm
        </button>
      </div>
      {error && (
        <div role="alert" style={{ color: "red", marginTop: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
}
