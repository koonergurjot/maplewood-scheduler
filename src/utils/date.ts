import { isoDate } from "../lib/dates";

/**
 * Generate an array of ISO date strings for a date range (inclusive)
 */
export function getDatesInRange(startISO: string, endISO: string): string[] {
  const dates: string[] = [];
  const current = new Date(startISO + "T00:00:00");
  const end = new Date(endISO + "T00:00:00");
  
  while (current <= end) {
    dates.push(isoDate(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Check if a date string is a weekday (Monday-Friday)
 */
export function isWeekday(dateISO: string): boolean {
  const date = new Date(dateISO + "T00:00:00");
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

/**
 * Get weekdays only from a date range
 */
export function getWeekdaysInRange(startISO: string, endISO: string): string[] {
  return getDatesInRange(startISO, endISO).filter(isWeekday);
}

/**
 * Apply a work pattern starting from a given date
 */
export function applyPreset(
  pattern: "all" | "weekdays" | "4-on-2-off" | "5-on-2-off",
  startISO: string,
  endISO: string
): string[] {
  const allDates = getDatesInRange(startISO, endISO);
  
  switch (pattern) {
    case "all":
      return [...allDates];
      
    case "weekdays":
      return getWeekdaysInRange(startISO, endISO);
      
    case "4-on-2-off": {
      const workDays: string[] = [];
      let workCounter = 0;
      let isWorkPeriod = true;
      
      for (const date of allDates) {
        if (isWorkPeriod && workCounter < 4) {
          workDays.push(date);
          workCounter++;
        } else if (!isWorkPeriod && workCounter < 2) {
          workCounter++;
        }
        
        if ((isWorkPeriod && workCounter === 4) || (!isWorkPeriod && workCounter === 2)) {
          isWorkPeriod = !isWorkPeriod;
          workCounter = 0;
        }
      }
      
      return workDays;
    }
    
    case "5-on-2-off": {
      const workDays: string[] = [];
      let workCounter = 0;
      let isWorkPeriod = true;
      
      for (const date of allDates) {
        if (isWorkPeriod && workCounter < 5) {
          workDays.push(date);
          workCounter++;
        } else if (!isWorkPeriod && workCounter < 2) {
          workCounter++;
        }
        
        if ((isWorkPeriod && workCounter === 5) || (!isWorkPeriod && workCounter === 2)) {
          isWorkPeriod = !isWorkPeriod;
          workCounter = 0;
        }
      }
      
      return workDays;
    }
    
    default:
      return [];
  }
}

/**
 * Format a coverage summary for display
 */
export function formatCoverageSummary(selectedDates: string[], totalDates: string[]): string {
  const selectedCount = selectedDates.length;
  const totalCount = totalDates.length;
  
  if (selectedCount === 0) {
    return "No coverage selected";
  }
  
  if (selectedCount === totalCount) {
    return `All ${totalCount} days`;
  }
  
  return `${selectedCount} of ${totalCount} days`;
}

/**
 * Get the day of week name for a date
 */
export function getDayOfWeekName(dateISO: string): string {
  const date = new Date(dateISO + "T00:00:00");
  return date.toLocaleDateString(undefined, { weekday: 'long' });
}

/**
 * Get short day of week name for a date  
 */
export function getDayOfWeekShort(dateISO: string): string {
  const date = new Date(dateISO + "T00:00:00");
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}