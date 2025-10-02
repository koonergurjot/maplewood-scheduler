import BodyLock from "./BodyLock";
import { useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Employee, Classification } from "../types";
import StatusPill from "./ui/StatusPill";

type Props = {
  open: boolean;
  employees: Employee[];
  classification?: Classification;
  onClose: () => void;
  onSelect: (employeeId: string) => void;
};

export default function EmployeePickerModal({ open, employees, classification, onClose, onSelect }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onClose);
  const [query, setQuery] = useState("");
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees
      .filter(e => e.active)
      .filter(e => !classification || e.classification === classification)
      .filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q))
      .sort((a,b) => a.seniorityRank - b.seniorityRank);
  }, [employees, query, classification]);

  if (!open) return null;
  return createPortal(
    <div className="modal-overlay">
      <BodyLock />
      <div role="dialog" aria-modal="true" className="modal" ref={dialogRef}>
        <div className="modal-h">Select employee</div>
        <input
          autoFocus
          placeholder="Search by name…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ width:"100%", marginBottom:8 }}
        />
        <div style={{ maxHeight: 360, overflow: "auto" }}>
          {list.map(e => (
            <button
              key={e.id}
              className="btn row"
              onClick={() => onSelect(e.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                textAlign: "left",
              }}
            >
              <span
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontWeight: 700 }}>
                  {e.firstName} {e.lastName}
                </span>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  • {e.classification} • Rank #{e.seniorityRank}
                </span>
              </span>
              <StatusPill active={e.active} label={e.activeLabel} />
            </button>
          ))}
        </div>
        <div className="modal-f" style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
