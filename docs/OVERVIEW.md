# Overview

Maplewood Scheduler is a web app for planning and tracking work schedules.
This document dives deeper into how the pieces fit together.

## Architecture

The app is split between a React/Vite front end and an Express server.
State persists to local storage and the server's data store.

## Sequence

```mermaid
sequenceDiagram
  participant U as User
  participant UI as Frontend
  participant API as Server
  participant DB as Database
  U->>UI: Load schedule
  UI->>API: GET /api/vacancies
  API->>DB: Query vacancies
  DB-->>API: Result set
  API-->>UI: JSON
  UI-->>U: Render schedule
```
