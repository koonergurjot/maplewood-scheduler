import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";

// Mock pdfjs so we don't rely on the actual library which expects
// additional assets when bundled for tests.
vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getTextContent: async () => ({
          items: [{ str: "Hello Agreement" }],
        }),
      }),
    }),
  }),
}));

describe("collectiveAgreement", () => {
  it("parses PDFs without relying on file extension", async () => {
    // Import after mocking pdfjs so the mock is applied.
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

  it("supports search options", async () => {
    const { loadAgreement, searchAgreement } = await import(
      "../server/collectiveAgreement.js",
    );
    const text = [
      "Alpha", // line 1
      "beta keyword", // line 2
      "Keyword", // line 3
      "keyword", // line 4
    ].join("\n");
    const tmpPath = path.join(process.cwd(), "temp-agreement-case.txt");
    fs.writeFileSync(tmpPath, text);
    try {
      await loadAgreement(tmpPath);
      const caseSensitive = searchAgreement("Keyword", { caseSensitive: true });
      expect(caseSensitive).toHaveLength(1);
      const caseInsensitive = searchAgreement("Keyword", { caseSensitive: false });
      expect(caseInsensitive).toHaveLength(3);
      const limited = searchAgreement("keyword", { limit: 1 });
      expect(limited).toHaveLength(1);
      const noContext = searchAgreement("Keyword", {
        caseSensitive: true,
        context: 0,
      });
      expect(noContext[0].context).toEqual(["Keyword"]);
    } finally {
      fs.unlinkSync(tmpPath);
    }
  });
});

