# Changelog

## [Unreleased] - 2025-01-03

### Fixed

- Tightened date and time utilities and added lint/test tooling.

### Added

#### Core Features

- **Enhanced Delete Functionality**
  - Added permanent DELETE button to VacancyDetail component with confirmation dialog
  - Individual vacancy deletion now available in both list view and detail view
  - Confirmation modal with "Cancel" (default) and "Delete" (destructive) buttons
  - Toast notification with "Vacancy deleted" message after successful deletion
  - All delete actions now use the existing staged deletion system with undo support

- **Coverage Days Picker for Multi-Day Vacancies**
  - New CoverageDaysModal component with calendar-style date picker
  - Support for selecting specific days within multi-day ranges that require coverage
  - Quick preset buttons for common patterns:
    - "All days" - Select every day in the range
    - "Weekdays only (Mon–Fri)" - Exclude weekends
    - "4-on/2-off pattern" - 4 working days, 2 off, repeating
    - "5-on/2-off pattern" - 5 working days, 2 off, repeating
    - "Clear selection" - Deselect all days
  - Live summary showing "Selected X of Y days"
  - Integrated into VacancyRangeForm for creating/editing multi-day vacancies
  - Coverage data persists to localStorage and existing data structures

- **Coverage Summary Display**
  - New CoverageChip component displays coverage information as compact badges
  - Shows on vacancy rows as "📅 X of Y days" with tooltip showing selected dates
  - Only appears for multi-day vacancies (ranges with more than 1 day)
  - Supports both compact and detailed display variants

#### Easy Win Improvements

- **Keyboard Shortcuts**
  - ESC key closes all modal dialogs (CoverageDaysModal, ConfirmDialog)
  - Enter key confirms actions in confirmation dialogs
  - Proper focus management and keyboard navigation in modals
  - All modals now have focus traps for accessibility

- **Loading & Empty States**
  - New LoadingSpinner component with size variants (sm/md/lg)
  - New EmptyState component with customizable icon, title, description, and action
  - Ready for integration in vacancy lists and data loading scenarios

- **Input Validation**
  - Comprehensive validation utilities for forms:
    - Date range validation (startDate ≤ endDate)
    - Required field validation with custom field names
    - Time format validation (HH:MM)
    - Time range validation with overnight shift support
    - Classification validation (RCA/LPN/RN)
    - Selection validation (at least one item selected)
  - Form save buttons now disabled when validation fails
  - Clear, user-friendly error messages

#### Technical Infrastructure

- **Enhanced Date Utilities**
  - `getDatesInRange()` - Generate inclusive date ranges
  - `isWeekday()` - Check if date is Monday-Friday
  - `getWeekdaysInRange()` - Filter weekdays from date range
  - `applyPreset()` - Apply work patterns (all/weekdays/4-on-2-off/5-on-2-off)
  - `formatCoverageSummary()` - Format coverage display text
  - Day of week helpers for display formatting

- **Type System Extensions**
  - Extended Vacancy type with optional `startDate`, `endDate`, and `coverageDates` fields
  - Backward compatibility maintained for existing single-day vacancies
  - VacancyRange type already supported multi-day coverage via `workingDays` array

- **Comprehensive Test Suite**
  - Unit tests for all date utility functions
  - Validation function tests with edge cases
  - Delete functionality logic tests
  - Coverage day pattern application tests
  - Test coverage for overnight shifts and boundary conditions

### Improved

- **VacancyRangeForm Enhancement**
  - Replaced manual day selection with intuitive "Select Coverage Days" button
  - Shows coverage summary before opening detailed picker
  - Cleaner UI with better organization of per-day time overrides
  - Auto-selects all days when date range is initially set

- **Modal Accessibility**
  - All modals now include proper ARIA labels and roles
  - Focus management ensures keyboard users can navigate efficiently
  - Screen reader friendly with live regions for dynamic content updates
  - Consistent modal styling and behavior across the application

- **User Experience**
  - Disabled save buttons when required fields are missing or invalid
  - Better visual feedback for form states and validation errors
  - Consistent button styling with destructive action indicators
  - Improved spacing and layout in complex forms

### Technical Details

#### File Structure
```
src/
├── components/
│   ├── ui/
│   │   ├── CoverageChip.tsx (new)
│   │   ├── LoadingSpinner.tsx (new)
│   │   ├── EmptyState.tsx (new)
│   │   └── ConfirmDialog.tsx (enhanced)
│   ├── CoverageDaysModal.tsx (new)
│   ├── VacancyDetail.tsx (enhanced)
│   ├── VacancyRangeForm.tsx (enhanced)
│   └── VacancyRow.tsx (enhanced)
├── utils/
│   ├── date.ts (new)
│   └── validation.ts (new)
├── types.ts (enhanced)
└── tests/
    ├── date.test.ts (new)
    ├── validation.test.ts (new)
    └── vacancies.test.ts (new)
```

#### Data Model Changes
- `Vacancy` type extended with optional multi-day fields for backward compatibility
- `VacancyRange.workingDays` serves as the equivalent of `coverageDates` for ranges
- All changes maintain existing data structure compatibility

#### Environment & Configuration
- No new environment variables required
- All functionality uses existing localStorage persistence
- No additional build configuration needed
- Compatible with existing Netlify deployment setup

### Testing
- All new utility functions have comprehensive unit tests
- Edge cases covered: overnight shifts, month boundaries, invalid inputs
- Accessibility testing for keyboard navigation and screen readers
- Cross-browser compatibility maintained

### Performance
- Minimal bundle size impact with tree-shakable utility functions
- Efficient date calculations using native Date API
- Modal components only render when needed
- No performance regressions in existing functionality

---

This update significantly enhances the user experience for managing multi-day vacancies while adding crucial delete functionality and form improvements. All changes maintain backward compatibility and follow existing code patterns and accessibility standards.