import { describe, it, expect } from "vitest";
import { parseNumberParam } from "../server/parseNumberParam.js";

describe("parseNumberParam", () => {
  it("returns undefined when value is undefined", () => {
    expect(parseNumberParam("foo", undefined)).toBeUndefined();
  });

  it("parses numeric strings", () => {
    expect(parseNumberParam("foo", "1.5")).toBe(1.5);
  });

  it("throws on non-numeric input", () => {
    expect(() => parseNumberParam("foo", "abc")).toThrow(
      "foo must be numeric",
    );
  });

  it("throws on empty strings", () => {
    expect(() => parseNumberParam("foo", "")).toThrow(
      "foo must be numeric",
    );
  });
});
