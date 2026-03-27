import { describe, it, expect, beforeEach, vi } from "vitest";

let GenerateService: any;
let service: any;

const mockParse = vi.fn();
const mockExtract = vi.fn();
const mockGenerateNotebook = vi.fn();
const mockBuild = vi.fn();

const mockPdfParser = { parse: mockParse };
const mockFigureExtractor = { extract: mockExtract };
const mockAiService = { generateNotebook: mockGenerateNotebook };
const mockNotebookBuilder = { build: mockBuild };

const fakeSections = [
  { title: "Abstract", content: "A novel algorithm." },
  { title: "1. Methods", content: "We propose..." },
];

const fakeParsed = {
  rawText: "A novel algorithm. We propose...",
  pageCount: 5,
  sections: fakeSections,
};

const fakeFigures = [
  { page: 1, base64: "iVBOR...", caption: "Figure 1" },
];

const fakeCells = [
  { cell_type: "markdown", source: "# Tutorial" },
  { cell_type: "code", source: "import numpy as np" },
];

const fakeNotebook = { nbformat: 4, cells: fakeCells };

beforeEach(async () => {
  vi.clearAllMocks();
  mockParse.mockResolvedValue(fakeParsed);
  mockExtract.mockResolvedValue(fakeFigures);
  mockGenerateNotebook.mockResolvedValue(fakeCells);
  mockBuild.mockReturnValue(fakeNotebook);

  const mod = await import("../../apps/api/src/generate/generate.service");
  GenerateService = mod.GenerateService;
  service = new GenerateService(
    mockPdfParser,
    mockFigureExtractor,
    mockAiService,
    mockNotebookBuilder
  );
});

describe("GenerateService", () => {
  it("calls pdfParser.parse with the buffer", async () => {
    const buf = Buffer.from("fake-pdf");
    await service.generate(buf, "sk-test");

    expect(mockParse).toHaveBeenCalledTimes(1);
    expect(mockParse).toHaveBeenCalledWith(buf);
  });

  it("calls figureExtractor.extract with the buffer", async () => {
    const buf = Buffer.from("fake-pdf");
    await service.generate(buf, "sk-test");

    expect(mockExtract).toHaveBeenCalledTimes(1);
    expect(mockExtract).toHaveBeenCalledWith(buf);
  });

  it("passes parsed sections, figures, and apiKey to aiService", async () => {
    const buf = Buffer.from("fake-pdf");
    await service.generate(buf, "sk-key-123");

    expect(mockGenerateNotebook).toHaveBeenCalledTimes(1);
    expect(mockGenerateNotebook).toHaveBeenCalledWith(
      fakeSections,
      fakeFigures,
      "sk-key-123"
    );
  });

  it("passes cells and figures to notebookBuilder.build", async () => {
    const buf = Buffer.from("fake-pdf");
    await service.generate(buf, "sk-test");

    expect(mockBuild).toHaveBeenCalledTimes(1);
    expect(mockBuild).toHaveBeenCalledWith(fakeCells, fakeFigures);
  });

  it("returns the built notebook", async () => {
    const buf = Buffer.from("fake-pdf");
    const result = await service.generate(buf, "sk-test");

    expect(result).toEqual(fakeNotebook);
  });

  it("continues with empty figures when figureExtractor throws", async () => {
    mockExtract.mockRejectedValue(new Error("extraction failed"));

    const buf = Buffer.from("fake-pdf");
    const result = await service.generate(buf, "sk-test");

    // Should still call AI service with empty figures array
    expect(mockGenerateNotebook).toHaveBeenCalledWith(
      fakeSections,
      [],
      "sk-test"
    );
    expect(mockBuild).toHaveBeenCalledWith(fakeCells, []);
    expect(result).toEqual(fakeNotebook);
  });

  it("propagates error when pdfParser.parse throws", async () => {
    mockParse.mockRejectedValue(new Error("parse failed"));

    const buf = Buffer.from("fake-pdf");
    await expect(service.generate(buf, "sk-test")).rejects.toThrow(
      "parse failed"
    );
  });

  it("propagates error when aiService.generateNotebook throws", async () => {
    mockGenerateNotebook.mockRejectedValue(
      new Error("Notebook generation failed. Please try again.")
    );

    const buf = Buffer.from("fake-pdf");
    await expect(service.generate(buf, "sk-test")).rejects.toThrow(
      /generation failed/i
    );
  });
});
