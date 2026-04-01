import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "fs";
import path from "path";

const mockNotebookCells = [
  {
    cell_type: "markdown",
    source: "# QuantumSort Tutorial\nImplementation of the paper.",
  },
  {
    cell_type: "code",
    source: "import numpy as np\n\ndef quantum_sort(arr):\n    return sorted(arr)",
  },
  {
    cell_type: "markdown",
    source: "## Testing\nLet's verify our implementation.",
  },
  {
    cell_type: "code",
    source: 'result = quantum_sort([5, 3, 1])\nassert result == [1, 3, 5]\nprint("Passed!")',
  },
];

let app: INestApplication;
let baseUrl: string;
let mockGenerateNotebook: ReturnType<typeof vi.fn>;
let mockParse: ReturnType<typeof vi.fn>;

const fixturePath = path.join(__dirname, "../fixtures/sample-paper.pdf");

describe("POST /generate — full pipeline", () => {
  beforeAll(async () => {
    mockGenerateNotebook = vi.fn().mockResolvedValue(mockNotebookCells);
    mockParse = vi.fn().mockResolvedValue({
      rawText: "Abstract This paper presents QuantumSort...",
      pageCount: 1,
      sections: [
        { title: "Abstract", content: "This paper presents QuantumSort, a novel sorting algorithm." },
        { title: "1. Introduction", content: "Sorting is fundamental." },
        { title: "2. Methods", content: "We propose quantum-inspired partitioning." },
      ],
    });

    const { GenerateController } = await import(
      "../../apps/api/src/generate/generate.controller"
    );
    const { GenerateService } = await import(
      "../../apps/api/src/generate/generate.service"
    );
    const { PdfParserService } = await import(
      "../../apps/api/src/pdf-parser/pdf-parser.service"
    );
    const { AiService } = await import("../../apps/api/src/ai/ai.service");
    const { NotebookBuilderService } = await import(
      "../../apps/api/src/notebook/notebook-builder.service"
    );
    const { FigureExtractorService } = await import(
      "../../apps/api/src/pdf-parser/figure-extractor.service"
    );
    const { ModelExtractorService } = await import(
      "../../apps/api/src/generate/model-extractor.service"
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [GenerateService, PdfParserService, AiService, NotebookBuilderService, FigureExtractorService, ModelExtractorService],
    })
      .overrideProvider(PdfParserService)
      .useValue({ parse: mockParse })
      .overrideProvider(AiService)
      .useValue({ generateNotebook: mockGenerateNotebook })
      .overrideProvider(FigureExtractorService)
      .useValue({ extract: vi.fn().mockResolvedValue([]) })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0);
    const address = app.getHttpServer().address();
    baseUrl = `http://localhost:${address.port}`;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("returns a valid .ipynb notebook for a valid PDF + apiKey", async () => {
    const pdfBuffer = fs.readFileSync(fixturePath);
    const formData = new FormData();
    formData.append(
      "pdf",
      new Blob([pdfBuffer], { type: "application/pdf" }),
      "paper.pdf"
    );

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test-key" },
      body: formData,
    });

    expect(res.status).toBe(200);

    const body = await res.json();

    // Validate nbformat structure
    expect(body.nbformat).toBe(4);
    expect(body.nbformat_minor).toBeGreaterThanOrEqual(0);
    expect(body.metadata).toHaveProperty("colab");
    expect(body.metadata).toHaveProperty("kernelspec");
    expect(body.metadata.kernelspec.language).toBe("python");

    // Validate cells
    expect(Array.isArray(body.cells)).toBe(true);
    expect(body.cells.length).toBe(4);

    const mdCell = body.cells[0];
    expect(mdCell.cell_type).toBe("markdown");
    expect(mdCell.source.join("")).toContain("QuantumSort");

    const codeCell = body.cells[1];
    expect(codeCell.cell_type).toBe("code");
    expect(codeCell.execution_count).toBeNull();
    expect(Array.isArray(codeCell.outputs)).toBe(true);
  });

  it("passes parsed sections to the AI service", async () => {
    mockGenerateNotebook.mockClear();
    mockParse.mockClear();

    const pdfBuffer = fs.readFileSync(fixturePath);
    const formData = new FormData();
    formData.append(
      "pdf",
      new Blob([pdfBuffer], { type: "application/pdf" }),
      "paper.pdf"
    );

    await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test-key" },
      body: formData,
    });

    // PdfParser should have been called with the file buffer
    expect(mockParse).toHaveBeenCalledTimes(1);

    // AI service should receive parsed sections
    expect(mockGenerateNotebook).toHaveBeenCalledTimes(1);
    const sections = mockGenerateNotebook.mock.calls[0][0];
    expect(Array.isArray(sections)).toBe(true);
    expect(sections[0].title).toBe("Abstract");

    // Third arg should be the apiKey
    const apiKey = mockGenerateNotebook.mock.calls[0][2];
    expect(apiKey).toBe("sk-test-key");
  });

  it("still validates inputs (no file = 400)", async () => {
    const formData = new FormData();

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test" },
      body: formData,
    });

    expect(res.status).toBe(400);
  });
});
