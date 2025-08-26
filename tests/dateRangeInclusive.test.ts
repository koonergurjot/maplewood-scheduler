import { describe, it, expect } from "vitest";
import { dateRangeInclusive } from "../src/App";

describe("dateRangeInclusive", () => {
  it("returns all dates including start and end", () => {
    const result = dateRangeInclusive("2021-03-13", "2021-03-15");
    expect(result).toEqual([
      "2021-03-13",
      "2021-03-14",
      "2021-03-15",
    ]);
  });
});
