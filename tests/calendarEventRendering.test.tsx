// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import CalendarView from "../src/components/CalendarView";
import type { CalendarEvent } from "../src/types/calendar";

test("renders calendar event with metadata", () => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const events: CalendarEvent[] = [
    {
      id: "v1",
      date: todayIso,
      shiftStart: "07:00",
      shiftEnd: "15:00",
      classification: "RN",
      wing: "A",
      status: "Open",
      employee: "Jane Doe",
      notes: "Test note",
    },
  ];

  const { container } = render(
    <MemoryRouter>
      <CalendarView vacancies={events} />
    </MemoryRouter>,
  );

  const pill = container.querySelector(".event-pill")!;
  expect(pill.dataset.status).toBe("Open");
  expect(pill.dataset.wing).toBe("A");
  expect(pill.dataset.class).toBe("RN");
  expect(pill.textContent).toContain("07:00–15:00");
});
