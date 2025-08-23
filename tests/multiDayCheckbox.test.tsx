// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import App from "../src/App";

test("multi-day checkbox clears endDate and inputs can set it", () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  const dateInput = screen.getByLabelText("Date") as HTMLInputElement;
  fireEvent.change(dateInput, { target: { value: "2024-08-01" } });

  const checkbox = screen.getByLabelText("1 day");
  fireEvent.click(checkbox);

  const startInput = screen.getByLabelText("Start Date") as HTMLInputElement;
  const endInput = screen.getByLabelText("End Date") as HTMLInputElement;
  expect(endInput.value).toBe("");

  fireEvent.change(startInput, { target: { value: "2024-08-02" } });
  fireEvent.change(endInput, { target: { value: "2024-08-03" } });
  expect(endInput.value).toBe("2024-08-03");
});
