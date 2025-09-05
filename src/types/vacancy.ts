import type { Vacancy as BaseVacancy } from "../types";

/**
 * Vacancy information augmented with ISO start/end timestamps
 * for use in calendar-based views.
 */
export interface CalendarVacancy extends BaseVacancy {
  /** ISO datetime representing the start of the shift */
  startIso: string;
  /** ISO datetime representing the end of the shift */
  endIso: string;
}
