import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

// Will import the service after implementation
let PdfParserService: any;
let service: any;

beforeAll(async () => {
  const mod = await import("../../apps/api/src/pdf-parser/pdf-parser.service");
  PdfParserService = mod.PdfParserService;
  service = new PdfParserService();
});

const fixturePath = path.join(__dirname, "../fixtures/sample-paper.pdf");

describe("PdfParserService", () => {
  it("extracts raw text from a PDF buffer", async () => {
    const buffer = fs.readFileSync(fixturePath);
    const result = await service.parse(buffer);

    expect(result).toHaveProperty("rawText");
    expect(result.rawText.length).toBeGreaterThan(100);
    expect(result.rawText).toContain("Abstract");
    expect(result.rawText).toContain("QuantumSort");
  });

  it("extracts page count", async () => {
    const buffer = fs.readFileSync(fixturePath);
    const result = await service.parse(buffer);

    expect(result).toHaveProperty("pageCount");
    expect(result.pageCount).toBe(1);
  });

  it("identifies paper sections by heading patterns", async () => {
    const buffer = fs.readFileSync(fixturePath);
    const result = await service.parse(buffer);

    expect(result).toHaveProperty("sections");
    expect(Array.isArray(result.sections)).toBe(true);
    expect(result.sections.length).toBeGreaterThanOrEqual(3);

    const sectionTitles = result.sections.map(
      (s: { title: string }) => s.title
    );
    expect(sectionTitles).toContain("Abstract");

    // Should find numbered sections
    const hasIntroduction = sectionTitles.some((t: string) =>
      t.toLowerCase().includes("introduction")
    );
    expect(hasIntroduction).toBe(true);

    const hasMethods = sectionTitles.some((t: string) =>
      t.toLowerCase().includes("methods")
    );
    expect(hasMethods).toBe(true);
  });

  it("each section has title and content", async () => {
    const buffer = fs.readFileSync(fixturePath);
    const result = await service.parse(buffer);

    for (const section of result.sections) {
      expect(section).toHaveProperty("title");
      expect(section).toHaveProperty("content");
      expect(typeof section.title).toBe("string");
      expect(typeof section.content).toBe("string");
      expect(section.title.length).toBeGreaterThan(0);
    }
  });

  it("handles empty/invalid PDF gracefully", async () => {
    const emptyBuffer = Buffer.from("not a pdf");
    await expect(service.parse(emptyBuffer)).rejects.toThrow();
  });
});
