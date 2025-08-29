// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import CalendarView from "../src/components/CalendarView";
import type { CalendarEvent } from "../src/types/calendar";

test("filled shifts hidden by default and toggle shows them", () => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const base = {
    date: todayIso,
    classification: "RN",
    shiftStart: "08:00",
    shiftEnd: "16:00",
  };
  const vacancies: CalendarEvent[] = [
    { ...base, id: "v1", status: "Open" },
    { ...base, id: "v2", status: "Pending" },
    { ...base, id: "v3", status: "Filled" },
  ];

  const { container } = render(
    <MemoryRouter>
      <CalendarView vacancies={vacancies} />
    </MemoryRouter>,
  );
  const toolbar = container.querySelector(".calendar-mini-toolbar")!;
  expect(toolbar.querySelector(".badge-open")?.textContent).toBe("1");
  expect(toolbar.querySelector(".badge-pending")?.textContent).toBe("1");
  expect(toolbar.querySelector(".badge-filled")?.textContent).toBe("1");
  expect(container.querySelector('.event-pill[data-status="Filled"]')).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: /Show Filled/i }));
  expect(container.querySelector('.event-pill[data-status="Filled"]')).not.toBeNull();
});

