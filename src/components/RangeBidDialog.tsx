import BodyLock from "./BodyLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { VacancyRange, Bid, Employee } from "../types";
import { randomId } from "../utils/id";

type Props = {
  open: boolean;
  onClose: () => void;
  range: VacancyRange;
  employees: Employee[];
  onSubmit: (bid: Bid) => void;
};

export default function RangeBidDialog({
  open,
  onClose,
  range,
  employees,
  onSubmit,
}: Props) {
  const workingDays = useMemo(() => range.workingDays ?? [], [range]);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [coverageType, setCoverageType] = useState<
    "full" | "some-days" | "partial-day"
  >("full");
  const [selectedDays, setSelectedDays] = useState<string[]>(workingDays);
  const [coverageError, setCoverageError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmployeeId("");
    setNote("");
    setCoverageType("full");
    setSelectedDays(workingDays);
    setCoverageError(null);
  }, [open, range.id, workingDays]);

  useEffect(() => {
    if (coverageType === "full" || selectedDays.length > 0) {
      setCoverageError(null);
    } else if (open) {
      setCoverageError("Select at least one working day.");
    }
  }, [coverageType, selectedDays, open]);

  const empOpts = useMemo(
    () =>
      employees
        .filter((e) => e.active)
        .sort((a, b) => a.seniorityRank - b.seniorityRank),
    [employees],
  );

  function toggleDay(d: string) {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  function submit() {
    if (!employeeId) return;
    if (coverageType !== "full" && selectedDays.length === 0) {
      setCoverageError("Select at least one working day.");
      return;
    }
    const employee = employees.find((x) => x.id === employeeId);
    const now = new Date().toISOString();
    const bid: Bid = {
      id: randomId("BID"),
      vacancyId: range.id,
      bidderEmployeeId: employeeId,
      bidderName: employee
        ? `${employee.firstName} ${employee.lastName}`.trim()
        : employeeId,
      bidderStatus: employee?.status ?? "FT",
      bidderClassification: employee?.classification ?? range.classification,
      bidTimestamp: now,
      createdAt: now,
      employeeId,
      notes: note || undefined,
      coverageType,
      selectedDays:
        coverageType === "full"
          ? [...workingDays]
          : [...selectedDays].sort(),
    };
    onSubmit(bid);
    onClose();
  }

  if (!open) return null;
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onClose);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <BodyLock />
      <div
        role="dialog"
        aria-modal="true"
        className="modal"
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Enter Bid for Multi‑day Vacancy</h2>
          <button onClick={onClose} className="px-2 py-1 rounded-md border">
            Close
          </button>
        </div>

        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Bidder</span>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="border rounded-md px-2 py-1"
            >
              <option value="">Select employee…</option>
              {empOpts.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.seniorityRank}. {e.lastName}, {e.firstName} — {e.classification}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="border rounded-md p-2">
            <legend className="px-1 text-sm">Coverage</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={coverageType === "full"}
                onChange={() => {
                  setCoverageType("full");
                  setSelectedDays(workingDays);
                  setCoverageError(null);
                }}
              />
              <span>Entire vacancy (all working days)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={coverageType === "some-days"}
                onChange={() => {
                  setCoverageType("some-days");
                  setSelectedDays((days) =>
                    days.length ? days : [...workingDays],
                  );
                  setCoverageError(null);
                }}
              />
              <span>Some days only</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={coverageType === "partial-day"}
                onChange={() => {
                  setCoverageType("partial-day");
                  setSelectedDays((days) =>
                    days.length ? days : [...workingDays],
                  );
                  setCoverageError(null);
                }}
              />
              <span>Partial-day (time differs on specific day)</span>
            </label>

            {coverageType !== "full" && (
              <div className="mt-2 max-h-48 overflow-auto border rounded p-2">
                {workingDays.map((d) => (
                  <label key={d} className="flex items-center gap-2 py-0.5">
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(d)}
                      onChange={() => toggleDay(d)}
                    />
                    <span>{d}</span>
                  </label>
                ))}
              </div>
            )}
            {coverageError && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {coverageError}
              </p>
            )}
          </fieldset>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Notes</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="border rounded-md px-2 py-1"
              rows={3}
              placeholder="Add context (e.g., availability, restrictions)"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-md border">
            Cancel
          </button>
          <button
            onClick={submit}
            className="px-3 py-2 rounded-md bg-black text-white"
            disabled={!employeeId}
          >
            Submit bid
          </button>
        </div>
      </div>
    </div>
  );
}
