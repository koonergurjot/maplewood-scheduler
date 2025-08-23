import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";

// Mock pdf-parse so we don't rely on the actual library which expects
// additional assets when bundled for tests.
vi.mock("pdf-parse", () => ({
  default: async () => ({ text: "Hello Agreement" }),
}));

describe("collectiveAgreement", () => {
  it("parses PDFs without relying on file extension", async () => {
    // Import after mocking pdf-parse so the mock is applied.
    const { loadAgreement, searchAgreement } = await import(
      "../server/collectiveAgreement.js"
    );
    // Create a buffer with a PDF signature but no file extension.
    const pdfBuffer = Buffer.concat([
      Buffer.from("%PDF"),
      Buffer.from(" test"),
    ]);
    const tmpPath = path.join(process.cwd(), "temp-agreement");
    fs.writeFileSync(tmpPath, pdfBuffer);
    try {
      await loadAgreement(tmpPath);
      const matches = searchAgreement("Hello");
      expect(matches[0].line).toContain("Hello Agreement");
    } finally {
      fs.unlinkSync(tmpPath);
    }
  });

  it("indexes text and returns context with line numbers", async () => {
    const { loadAgreement, searchAgreement } = await import(
      "../server/collectiveAgreement.js"
    );
    const text = [
      "first line",
      "second keyword line",
      "third line",
      "fourth keyword line",
    ].join("\n");
    const tmpPath = path.join(process.cwd(), "temp-agreement.txt");
    fs.writeFileSync(tmpPath, text);
    try {
      await loadAgreement(tmpPath);
      const matches = searchAgreement("keyword");
      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({
        lineNumber: 2,
        line: "second keyword line",
        context: ["first line", "second keyword line", "third line"],
      });
      expect(matches[1]).toEqual({
        lineNumber: 4,
        line: "fourth keyword line",
        context: ["third line", "fourth keyword line"],
      });
    } finally {
      fs.unlinkSync(tmpPath);
    }
  });
});

