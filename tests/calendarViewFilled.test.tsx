// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { expect, test } from "vitest";
import CalendarView from "../src/components/CalendarView";
import type { Vacancy } from "../src/App";

test("filled shifts hidden by default and toggle shows them", () => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const base: any = {
    reason: "Test",
    classification: "RN",
    date: todayIso,
    shiftStart: "08:00",
    shiftEnd: "16:00",
    knownAt: new Date().toISOString(),
    offeringTier: "CASUALS",
    offeringStep: "Casuals",
  };
  const vacancies: Vacancy[] = [
    { ...base, id: "v1", status: "Open" },
    { ...base, id: "v2", status: "Pending" as any },
    { ...base, id: "v3", status: "Filled" },
  ];

  const { container } = render(<CalendarView vacancies={vacancies} />);
  const toolbar = container.querySelector(".calendar-mini-toolbar")!;
  expect(toolbar.querySelector(".badge-open")?.textContent).toBe("1");
  expect(toolbar.querySelector(".badge-pending")?.textContent).toBe("1");
  expect(toolbar.querySelector(".badge-filled")?.textContent).toBe("1");
  expect(container.querySelector('.event-pill[data-status="Filled"]')).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: /Show Filled/i }));
  expect(container.querySelector('.event-pill[data-status="Filled"]')).not.toBeNull();
});

