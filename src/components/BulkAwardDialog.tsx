import { useEffect, useMemo, useState } from "react";
import type { Bid, Employee, Vacancy } from "../types";
import { OVERRIDE_REASONS } from "../types";
import { logBulkAward } from "../utils/logger";

type Props = {
  open: boolean;
  employees: Employee[];
  vacancies: Vacancy[];
  bids: Bid[];
  onConfirm: (payload: { empId?: string; reason?: string; overrideUsed?: boolean; message?: string }) => void;
  onClose: () => void;
};

export default function BulkAwardDialog({ open, employees, vacancies, bids, onConfirm, onClose }: Props) {
  const [empId, setEmpId] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [overrideChecked, setOverrideChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedEmployee = useMemo(() => employees.find((e) => e.id === empId) ?? null, [employees, empId]);

  const missingBundleDays = useMemo(() => {
    if (!empId || !vacancies.length) return [] as { bundleId: string; dates: string[] }[];
    if (!vacancies.some((v) => v.bundleId)) return [] as { bundleId: string; dates: string[] }[];

    const employeeBidVacancies = new Set(
      bids
        .filter((b) => {
          const bidderId = b.bidderEmployeeId || b.employeeId;
          return bidderId === empId;
        })
        .map((b) => b.vacancyId),
    );

    const groups = new Map<string, { bundleId: string; dates: Set<string> }>();

    for (const vacancy of vacancies) {
      const bundleKey = vacancy.bundleId;
      if (!bundleKey) continue;
      if (employeeBidVacancies.has(vacancy.id)) continue;

      if (!groups.has(bundleKey)) {
        groups.set(bundleKey, {
          bundleId: bundleKey,
          dates: new Set<string>(),
        });
      }

      if (vacancy.shiftDate) {
        groups.get(bundleKey)!.dates.add(vacancy.shiftDate);
      }
    }

    return Array.from(groups.values())
      .map((group) => ({
        bundleId: group.bundleId,
        dates: Array.from(group.dates).sort(),
      }))
      .filter((group) => group.dates.length > 0);
  }, [bids, empId, vacancies]);

  useEffect(() => {
    if (!missingBundleDays.length) {
      setOverrideChecked(false);
    }
  }, [missingBundleDays.length]);

  useEffect(() => {
    setOverrideChecked(false);
  }, [empId]);

  useEffect(() => {
    setError(null);
  }, [empId, reason, message, overrideChecked, missingBundleDays.length]);

  useEffect(() => {
    if (!open) {
      setEmpId("");
      setMessage("");
      setReason("");
      setOverrideChecked(false);
      setError(null);
    }
  }, [open]);

  const confirm = async () => {
    if (!empId) return;

    if (missingBundleDays.length && !overrideChecked) {
      setError("Override required to award bundled days without matching bids.");
      return;
    }

    if (overrideChecked && !reason) {
      setError("Please select an override reason.");
      return;
    }

    const payload = {
      empId: empId || undefined,
      reason: reason || undefined,
      overrideUsed: overrideChecked,
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
    setOverrideChecked(false);
  };

  if (!open) return null;

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
      {missingBundleDays.length > 0 && selectedEmployee && (
        <div
          role="alert"
          style={{
            backgroundColor: "#fff3cd",
            border: "1px solid #ffe69c",
            borderRadius: 4,
            color: "#664d03",
            marginTop: 12,
            padding: 12,
          }}
        >
          <p style={{ margin: "0 0 8px" }}>
            {selectedEmployee.firstName} {selectedEmployee.lastName} has no bid for the following bundle dates:
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {missingBundleDays.map((group) => (
              <li key={group.bundleId}>
                Bundle {group.bundleId}: {group.dates.join(", ")}
              </li>
            ))}
          </ul>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <input
              type="checkbox"
              checked={overrideChecked}
              onChange={(e) => setOverrideChecked(e.target.checked)}
            />
            Override and award without matching bids
          </label>
          {overrideChecked && (
            <p style={{ margin: "8px 0 0" }}>
              An override reason is required to continue.
            </p>
          )}
        </div>
      )}
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
