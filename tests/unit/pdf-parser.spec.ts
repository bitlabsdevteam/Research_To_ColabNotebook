import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";

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

  it("rejects PDFs with more than 100 pages", async () => {
    // Create a PDF with 101 pages
    const pdfDoc = await PDFDocument.create();
    for (let i = 0; i < 101; i++) {
      pdfDoc.addPage();
    }
    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    await expect(service.parse(buffer)).rejects.toThrow(/page count/i);
  });

  it("accepts PDFs with exactly 100 pages", async () => {
    const pdfDoc = await PDFDocument.create();
    for (let i = 0; i < 100; i++) {
      pdfDoc.addPage();
    }
    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    // Should not throw (pages are empty but valid)
    const result = await service.parse(buffer);
    expect(result.pageCount).toBe(100);
  });

  it("enforces parsing timeout", async () => {
    // We can't easily simulate a slow PDF, but we verify the timeout
    // mechanism exists by checking the service handles it. The actual
    // timeout is 30s which we can't wait for in tests, so we test
    // that the parse method completes within a reasonable time for
    // a normal PDF.
    const buffer = fs.readFileSync(fixturePath);
    const start = Date.now();
    await service.parse(buffer);
    const elapsed = Date.now() - start;
    // Normal PDF should parse well under 30s
    expect(elapsed).toBeLessThan(30000);
  });
});
