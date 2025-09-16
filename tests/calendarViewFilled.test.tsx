// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { expect, test } from "vitest";
import CalendarView from "../src/components/CalendarView";
import type { Vacancy } from "../src/types";

test("awarded and filled shifts hidden by default and toggle shows them", () => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const base: Omit<Vacancy, "id" | "status"> = {
    reason: "Test",
    classification: "RN",
    date: todayIso,
    start: "08:00",
    end: "16:00",
    shiftDate: todayIso,
    shiftStart: "08:00",
    shiftEnd: "16:00",
    knownAt: new Date().toISOString(),
    offeringTier: "CASUALS",
    offeringStep: "Casuals",
  } as const;
  const vacancies: Vacancy[] = [
    { ...base, id: "v1", status: "Open" },
    { ...base, id: "v2", status: "Awarded" },
    { ...base, id: "v3", status: "Filled" },
  ];

  const { container } = render(
    <CalendarView vacancies={vacancies} onCreateVacancy={() => {}} />,
  );
  const toolbar = container.querySelector(".calendar-mini-toolbar")!;
  expect(toolbar.querySelector(".badge-open")?.textContent).toBe("1");
  expect(toolbar.querySelector(".badge-awarded")?.textContent).toBe("1");
  expect(toolbar.querySelector(".badge-filled")?.textContent).toBe("1");
  expect(container.querySelector('.event-pill[data-status="Awarded"]')).toBeNull();
  expect(container.querySelector('.event-pill[data-status="Filled"]')).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: /Show awarded and filled/i }));
  expect(container.querySelector('.event-pill[data-status="Awarded"]')).not.toBeNull();
  expect(container.querySelector('.event-pill[data-status="Filled"]')).not.toBeNull();
});

