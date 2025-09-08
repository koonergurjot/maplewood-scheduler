import React, { useMemo } from "react";
import type { Vacancy } from "../types";

interface Props {
  vacancies: Vacancy[];
  onAwardBundle: (bundleId: string) => void;
  onDeleteBundle: (bundleId: string) => void;
  onDeleteSingle: (id: string) => void;
}

export default function BlocksAndSingles({
  vacancies,
  onAwardBundle,
  onDeleteBundle,
  onDeleteSingle,
}: Props) {
  const { blocks, singles } = useMemo(() => {
    const groups = new Map<string, Vacancy[]>();
    const singles: Vacancy[] = [];
    for (const v of vacancies) {
      if (v.bundleId) {
        const arr = groups.get(v.bundleId) || [];
        arr.push(v);
        groups.set(v.bundleId, arr);
      } else {
        singles.push(v);
      }
    }
    const blocks = Array.from(groups.entries()).filter(([, arr]) => arr.length >= 2);
    for (const [id, arr] of groups) {
      if (arr.length < 2) singles.push(...arr);
    }
    blocks.sort((a, b) => a[1][0].shiftDate.localeCompare(b[1][0].shiftDate));
    singles.sort((a, b) =>
      a.shiftDate === b.shiftDate
        ? a.shiftStart.localeCompare(b.shiftStart)
        : a.shiftDate.localeCompare(b.shiftDate)
    );
    return { blocks, singles };
  }, [vacancies]);

  return (
    <table className="vacancies">
      <tbody>
        {blocks.map(([id, items]) => (
          <tr key={id}>
            <td>
              <strong>
                Block: {items[0].shiftDate} – {items[items.length - 1].shiftDate}
              </strong>{" "}
              ({items.length} days)
            </td>
            <td>
              <button className="btn btn-sm" onClick={() => onAwardBundle(id)}>
                Award
              </button>
              <button
                className="btn btn-sm danger"
                onClick={() => onDeleteBundle(id)}
                style={{ marginLeft: 8 }}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
        {singles.map((v) => (
          <tr key={v.id}>
            <td>
              {v.shiftDate} • {v.shiftStart}–{v.shiftEnd} • {v.classification}
            </td>
            <td>
              <button
                className="btn btn-sm danger"
                onClick={() => onDeleteSingle(v.id)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
