import { describe, it, expect } from "vitest";
import { reorder } from "../src/utils/reorder";

describe("reorder utility", () => {
  it("moves item within array", () => {
    const result = reorder(["a", "b", "c"], 0, 2);
    expect(result).toEqual(["b", "c", "a"]);
  });

  it("moves item backward in array", () => {
    const result = reorder(["a", "b", "c"], 2, 0);
    expect(result).toEqual(["c", "a", "b"]);
  });

  it("returns original array when index is out of range", () => {
    const arr = ["a", "b", "c"];
    const result = reorder(arr, 5, 0);
    expect(result).toBe(arr);
  });

  it("returns original array when from equals to", () => {
    const arr = ["a", "b", "c"];
    const result = reorder(arr, 1, 1);
    expect(result).toBe(arr);
  });

  it("does not mutate the input array", () => {
    const arr = ["a", "b", "c"];
    const copy = [...arr];
    reorder(arr, 0, 2);
    expect(arr).toEqual(copy);
  });
});
