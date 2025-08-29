export interface CalendarEvent {
  /** Unique identifier for the vacancy */
  id: string;
  /** ISO date string (yyyy-mm-dd) for the shift */
  date: string;
  /** Shift start time (HH:mm) */
  shiftStart?: string;
  /** Shift end time (HH:mm) */
  shiftEnd?: string;
  /** Unit or wing */
  wing?: string;
  /** Employee classification */
  classification?: string;
  /** Status shown on the calendar */
  status: "Open" | "Pending" | "Filled" | "Awarded";
  /** Assigned employee name, if any */
  employee?: string;
  /** Optional notes */
  notes?: string;
}
