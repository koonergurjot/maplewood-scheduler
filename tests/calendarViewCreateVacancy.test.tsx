// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import CalendarView from "../src/components/CalendarView";

test("New Vacancy button triggers creation handler", () => {
  const handleCreate = vi.fn();
  render(<CalendarView vacancies={[]} onCreateVacancy={handleCreate} />);

  const button = screen.getByRole("button", { name: /new vacancy/i });
  fireEvent.click(button);

  expect(handleCreate).toHaveBeenCalledTimes(1);
});
