import { useState } from "react";
import type { Bid, Vacancy, Vacation, Employee } from "../App";
import EmployeeCombo from "../components/EmployeeCombo";
import { isoDate } from "../utils/date";
import { displayVacancyLabel } from "../utils/format";

export default function BidsView({
  bids,
  setBids,
  vacancies,
  vacations,
  employees,
  employeesById,
}: {
  bids: Bid[];
  setBids: (u: any) => void;
  vacancies: Vacancy[];
  vacations: Vacation[];
  employees: Employee[];
  employeesById: Record<string, Employee>;
}) {
  const [newBid, setNewBid] = useState<
    Partial<Bid & { bidDate: string; bidTime: string }>
  >({});

  const vacWithCoveredName = (v: Vacancy) => {
    const vac = vacations.find((x) => x.id === v.vacationId);
    const covered = vac ? vac.employeeName : "";
    return `${displayVacancyLabel(v)} — covering ${covered}`.trim();
  };

  const setNow = () => {
    const now = new Date();
    const d = isoDate(now);
    const t = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
    setNewBid((b) => ({ ...b, bidDate: d, bidTime: t }));
  };

  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">Add Bid</div>
        <div className="card-c">
          <div className="row cols2">
            <div>
              <label>Vacancy</label>
              <select
                onChange={(e) =>
                  setNewBid((b) => ({ ...b, vacancyId: e.target.value }))
                }
                value={newBid.vacancyId ?? ""}
              >
                <option value="" disabled>
                  Pick vacancy
                </option>
                {vacancies.map((v) => (
                  <option key={v.id} value={v.id}>
                    {vacWithCoveredName(v)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Employee</label>
              <EmployeeCombo
                employees={employees}
                onSelect={(id) => {
                  const e = employeesById[id];
                  setNewBid((b) => ({
                    ...b,
                    bidderEmployeeId: id,
                    bidderName: e ? `${e.firstName} ${e.lastName}` : "",
                    bidderStatus: e?.status,
                    bidderClassification: e?.classification,
                  }));
                }}
              />
            </div>
            <div>
              <label>Bid Date</label>
              <input
                type="date"
                value={newBid.bidDate ?? ""}
                onChange={(e) =>
                  setNewBid((b) => ({ ...b, bidDate: e.target.value }))
                }
              />
            </div>
            <div>
              <label>Bid Time</label>
              <div className="form-row">
                <input
                  type="time"
                  value={newBid.bidTime ?? ""}
                  onChange={(e) =>
                    setNewBid((b) => ({ ...b, bidTime: e.target.value }))
                  }
                />
                <button className="btn" onClick={setNow}>
                  Now
                </button>
              </div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Notes</label>
              <input
                placeholder={'e.g., "available for 06:30-14:30"'}
                onChange={(e) =>
                  setNewBid((b) => ({ ...b, notes: e.target.value }))
                }
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button
                className="btn"
                onClick={() => {
                  if (!newBid.vacancyId || !newBid.bidderEmployeeId)
                    return alert("Vacancy and employee required");
                  const ts =
                    newBid.bidDate && newBid.bidTime
                      ? new Date(
                          `${newBid.bidDate}T${newBid.bidTime}:00`
                        ).toISOString()
                      : new Date().toISOString();
                  setBids((prev: Bid[]) => [
                    ...prev,
                    {
                      vacancyId: newBid.vacancyId!,
                      bidderEmployeeId: newBid.bidderEmployeeId!,
                      bidderName: newBid.bidderName!,
                      bidderStatus: newBid.bidderStatus!,
                      bidderClassification: newBid.bidderClassification!,
                      bidTimestamp: ts,
                      notes: newBid.notes ?? "",
                    },
                  ]);
                  setNewBid({});
                }}
              >
                Add Bid
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">All Bids</div>
        <div className="card-c">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Vacancy</th>
                <th>Employee</th>
                <th>Class</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {bids.map((b, i) => {
                const v = vacancies.find((x) => x.id === b.vacancyId);
                return (
                  <tr key={i}>
                    <td>{v ? displayVacancyLabel(v) : b.vacancyId}</td>
                    <td>{b.bidderName}</td>
                    <td>{b.bidderClassification}</td>
                    <td>{b.bidderStatus}</td>
                    <td>{new Date(b.bidTimestamp).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
