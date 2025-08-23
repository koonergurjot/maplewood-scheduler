import type { Vacancy as BaseVacancy } from "../App";

/**
 * Vacancy information augmented with ISO start/end timestamps
 * for use in calendar-based views.
 */
export interface CalendarVacancy extends BaseVacancy {
  /** ISO datetime representing the start of the shift */
  start: string;
  /** ISO datetime representing the end of the shift */
  end: string;
}
