import { describe, it, expect } from "vitest";
import { reorder } from "../src/utils/reorder";

describe("reorder utility", () => {
  it("moves item within array", () => {
    const result = reorder(["a", "b", "c"], 0, 2);
    expect(result).toEqual(["b", "c", "a"]);
  });
});
