import { describe, it, expect } from "vitest";
import { logOfferingChange, filterAuditLogs, clearAuditLogs } from "../src/lib/audit";
import { createMemoryStorage } from "../src/lib/storage";

describe("filterAuditLogs", () => {
  it("filters by date and vacancy id", () => {
    const storage = createMemoryStorage();
    const today = new Date().toISOString().slice(0, 10);
    logOfferingChange(
      {
        vacancyId: "1",
        from: "CASUALS",
        to: "OT_FULL_TIME",
        actor: "system",
        reason: "manual",
      },
      storage,
    );
    const byDate = filterAuditLogs(storage, { date: today });
    expect(byDate).toHaveLength(1);
    const none = filterAuditLogs(storage, { vacancyId: "2" });
    expect(none).toHaveLength(0);
    clearAuditLogs(storage);
  });
});
