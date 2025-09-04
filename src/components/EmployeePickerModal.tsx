import React, { useMemo, useState } from "react";
import type { Employee, Classification } from "../types";

type Props = {
  open: boolean;
  employees: Employee[];
  classification?: Classification;
  onClose: () => void;
  onSelect: (employeeId: string) => void;
};

export default function EmployeePickerModal({ open, employees, classification, onClose, onSelect }: Props) {
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
  return (
    <div className="modal-overlay">
      <div className="modal">
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
            <button key={e.id} className="btn row" onClick={() => onSelect(e.id)}>
              {e.firstName} {e.lastName} • {e.classification} • Rank #{e.seniorityRank}
            </button>
          ))}
        </div>
        <div className="modal-f" style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
