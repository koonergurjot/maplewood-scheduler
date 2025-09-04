// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import BundleRow from "../src/components/BundleRow";
import type { Vacancy, Employee, Settings } from "../src/types";

describe("BundleRow", () => {
  afterEach(cleanup);
  const baseVacancy = {
    reason: "Vacation",
    classification: "RN",
    shiftStart: "08:00",
    shiftEnd: "16:00",
    knownAt: "2024-01-01T00:00:00.000Z",
    offeringTier: "CASUALS",
    offeringStep: "Casuals",
    status: "Open",
  } as const;

  const settings: Settings = {
    responseWindows: {
      lt2h: 30,
      h2to4: 60,
      h4to24: 120,
      h24to72: 240,
      gt72: 480,
    },
  };

  it("shows a Multiple wings tag with tooltip listing wings", () => {
    const items: Vacancy[] = [
      { ...baseVacancy, id: "v1", wing: "A", shiftDate: "2024-01-01" },
      { ...baseVacancy, id: "v2", wing: "B", shiftDate: "2024-01-02" },
    ];

    render(
      <table>
        <tbody>
          <BundleRow
            groupId="g1"
            items={items}
            employees={[] as Employee[]}
            settings={settings}
            recommendations={{}}
            selectedIds={[]}
            onToggleSelectMany={() => {}}
            onDeleteMany={() => {}}
            onSplitBundle={() => {}}
            dueNextId={null}
          />
        </tbody>
      </table>
    );

    const tag = screen.getByText("Multiple wings");
    expect(tag).toBeTruthy();
    expect(tag.getAttribute("title")).toBe("A, B");
  });

  it("adds a divider between expanded child items", () => {
    const items: Vacancy[] = [
      { ...baseVacancy, id: "v1", wing: "A", shiftDate: "2024-01-01" },
      { ...baseVacancy, id: "v2", wing: "B", shiftDate: "2024-01-02" },
    ];

    const { container } = render(
      <table>
        <tbody>
          <BundleRow
            groupId="g1"
            items={items}
            employees={[] as Employee[]}
            settings={settings}
            recommendations={{}}
            selectedIds={[]}
            onToggleSelectMany={() => {}}
            onDeleteMany={() => {}}
            onSplitBundle={() => {}}
            dueNextId={null}
          />
        </tbody>
      </table>
    );

    fireEvent.click(screen.getByText("Expand"));
    const rows = container.querySelectorAll(".bundle-expand > div");
    expect(rows.length).toBe(2);
    expect(rows[0].getAttribute("style") ?? "").not.toContain("border-top");
    expect(rows[1].getAttribute("style")).toContain(
      "border-top: 1px solid var(--stroke)"
    );
  });
});

