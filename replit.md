# Overview

Maplewood Scheduler is a comprehensive React-based scheduling application for healthcare facilities, built with Vite and TypeScript. The system manages employee schedules, vacation coverage, bid processing, and shift assignments with a focus on seniority-based coverage allocation and regulatory compliance.

The application handles the full lifecycle of vacancy management - from creation through offering tiers (Casuals → OT Full-Time → OT Casuals → Last Resort RN) to final award decisions. It includes sophisticated features like multi-day vacancy ranges, bulk operations, coverage day selection, and comprehensive audit trails.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: React Router DOM for client-side navigation
- **State Management**: Custom hooks with localStorage persistence (useSchedulerState, useVacancies)
- **Styling**: CSS modules with custom properties for theming, responsive design system

## Component Structure
- **Core Components**: App.tsx (main scheduler), Dashboard.tsx (overview), CalendarView.tsx (visual calendar)
- **Vacancy Management**: VacancyDetail, VacancyRow, VacancyList, VacancyRangeForm for multi-day shifts
- **UI Components**: Modular system with ConfirmDialog, Toast notifications, LoadingSpinner, EmptyState
- **Specialized Features**: CoverageDaysModal for selecting specific coverage days, BulkAwardDialog for batch operations

## Data Models
- **Core Entities**: Employee, Vacancy, Vacation, Bid with comprehensive type definitions
- **Advanced Features**: VacancyRange for multi-day shifts, coverage date selection, bid coverage types
- **Audit System**: Complete audit log with offering tier changes and user actions

## Business Logic
- **Offering System**: State machine managing vacancy progression through offering tiers with auto-advance timers
- **Recommendation Engine**: Seniority-based bid recommendations with classification matching
- **Bulk Operations**: Multi-vacancy awards and bid applications with bundle support
- **Validation**: Comprehensive form validation, date range checking, and eligibility gates

## Persistence Layer
- **Storage**: localStorage-based persistence with migration support and error recovery
- **State Sync**: Automatic state persistence across browser sessions
- **Data Integrity**: Backup/restore functionality and corrupted data recovery

# External Dependencies

## Core Dependencies
- **React Ecosystem**: react@18.3.1, react-dom@18.3.1, react-router-dom@6.23.0
- **Charts**: chart.js@4.4.1, react-chartjs-2@5.2.0 for analytics visualization
- **File Processing**: papaparse@5.4.1 for CSV imports, pdfjs-dist@5.4.149 for PDF parsing

## Server Components (Express Backend)
- **Web Server**: express@5.1.0 with cors@2.8.5 for API endpoints
- **File Handling**: pdfkit@0.17.2 for PDF generation
- **Authentication**: Token-based auth system for analytics endpoints

## Development Tools
- **Build System**: @vitejs/plugin-react@4.3.1, typescript@5.4.5
- **Testing**: vitest@1.6.0, @testing-library/react@16.3.0, jsdom@24.0.0
- **Type Safety**: @types/react@18.3.3, @types/react-dom@18.3.0, @types/node@22.7.0

## External Services Integration
- **Analytics API**: Bearer token authentication for protected analytics endpoints
- **Export Systems**: CSV and PDF generation for reporting and data export

## Deployment Architecture
- **Target Platform**: Netlify-optimized build configuration
- **Node Version**: Locked to 18.20.8 for consistency
- **CI Build**: Separate TypeScript configuration (tsconfig.ci.json) with relaxed type checking