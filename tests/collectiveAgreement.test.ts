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
      expect(matches[0]).toContain("Hello Agreement");
    } finally {
      fs.unlinkSync(tmpPath);
    }
  });
});

