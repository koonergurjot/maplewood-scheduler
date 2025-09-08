/**
 * Validation utilities for form inputs
 */
/**
 * Validate date range (start date should be <= end date)
 */
export function validateDateRange(startDate, endDate) {
    if (!startDate || !endDate) {
        return { isValid: false, error: "Both start and end dates are required" };
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
        return { isValid: false, error: "Start date must be before or equal to end date" };
    }
    return { isValid: true };
}
/**
 * Validate required text field
 */
export function validateRequired(value, fieldName) {
    if (!value || value.trim().length === 0) {
        return { isValid: false, error: `${fieldName} is required` };
    }
    return { isValid: true };
}
/**
 * Validate time format (HH:MM)
 */
export function validateTime(time) {
    if (!time) {
        return { isValid: false, error: "Time is required" };
    }
    const timeRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
        // enforce zero-padded 24h format
        return { isValid: false, error: "Time must be in HH:MM format" };
    }
    return { isValid: true };
}
/**
 * Validate time range (start time should be before end time)
 */
export function validateTimeRange(startTime, endTime) {
    const startValid = validateTime(startTime);
    if (!startValid.isValid) {
        return startValid;
    }
    const endValid = validateTime(endTime);
    if (!endValid.isValid) {
        return endValid;
    }
    // Convert times to minutes for comparison
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    if (endMinutes <= startMinutes) {
        const duration = 24 * 60 - startMinutes + endMinutes;
        if (duration <= 12 * 60) {
            // allow overnight shifts up to 12 hours
            return { isValid: true };
        }
        return { isValid: false, error: "Start time must be before end time" };
    }
    return { isValid: true };
}
/**
 * Validate classification
 */
export function validateClassification(classification) {
    const validClassifications = ["RCA", "LPN", "RN"];
    if (!classification) {
        return { isValid: false, error: "Classification is required" };
    }
    if (!validClassifications.includes(classification)) {
        return { isValid: false, error: "Classification must be RCA, LPN, or RN" };
    }
    return { isValid: true };
}
/**
 * Validate selection has at least one item
 */
export function validateSelection(selection, fieldName) {
    if (!selection || selection.length === 0) {
        return { isValid: false, error: `At least one ${fieldName} must be selected` };
    }
    return { isValid: true };
}
