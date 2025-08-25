
import React from "react";

type Props = {
  openCount: number;
  awardedToday: number;
  pendingRequests: number;
};

export default function SummaryCards({ openCount, awardedToday, pendingRequests }: Props) {
  return (
    <section className="summary-grid" aria-label="Summary">
      <div className="card" role="status">
        <div className="label">Open Shifts</div>
        <div className="value">{openCount}</div>
        <div className="delta">Awaiting award</div>
      </div>
      <div className="card">
        <div className="label">Awarded Today</div>
        <div className="value">{awardedToday}</div>
        <div className="delta">Congrats &amp; notifications sent</div>
      </div>
      <div className="card">
        <div className="label">Requests Pending</div>
        <div className="value">{pendingRequests}</div>
        <div className="delta">Need manager review</div>
      </div>
    </section>
  );
}
