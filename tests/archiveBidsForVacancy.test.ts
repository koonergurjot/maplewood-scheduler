import { describe, it, expect } from "vitest";
import { archiveBidsForVacancy, type Bid } from "../src/App";

describe("archiveBidsForVacancy", () => {
  it("moves bids for a vacancy into archived map", () => {
    const bids: Bid[] = [
      {
        vacancyId: "v1",
        bidderEmployeeId: "e1",
        bidderName: "A",
        bidderStatus: "FT",
        bidderClassification: "RN",
        bidTimestamp: "2024-01-01T00:00:00Z",
      },
      {
        vacancyId: "v2",
        bidderEmployeeId: "e2",
        bidderName: "B",
        bidderStatus: "PT",
        bidderClassification: "RN",
        bidTimestamp: "2024-01-02T00:00:00Z",
      },
    ];
    const archived: Record<string, Bid[]> = {
      v2: [
        {
          vacancyId: "v2",
          bidderEmployeeId: "e3",
          bidderName: "C",
          bidderStatus: "FT",
          bidderClassification: "RN",
          bidTimestamp: "2024-01-03T00:00:00Z",
        },
      ],
    };
    const res = archiveBidsForVacancy(bids, archived, "v1");
    expect(res.bids).toHaveLength(1);
    expect(res.bids[0].vacancyId).toBe("v2");
    expect(res.archivedBids.v1).toHaveLength(1);
    expect(res.archivedBids.v1[0].vacancyId).toBe("v1");
    expect(res.archivedBids.v2).toHaveLength(1);
  });
});
