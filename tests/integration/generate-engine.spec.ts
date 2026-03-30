/**
 * Task 1 (v6): Audit and end-to-end test the core /generate engine
 *
 * ISSUES FOUND DURING AUDIT (documented below, fixed in Tasks 2–4):
 *
 * ISSUE-1 [CRITICAL]: `gpt-5.4` model does not exist.
 *   AiService uses model: "gpt-5.4" — OpenAI will reject this.
 *   Real API calls will always fail with "model not found".
 *   Fix: Change to "gpt-4o" or "gpt-4o-mini" in Task 4.
 *
 * ISSUE-2 [HIGH]: No timeout on the OpenAI API call.
 *   AiService.generateNotebook has no AbortController or timeout wrapper.
 *   A slow/stalled OpenAI call will hang the request indefinitely.
 *   Fix: Add 60s AbortController timeout in Task 3.
 *
 * ISSUE-3 [HIGH]: No notebook-level structural validation.
 *   AiService validates individual cell structure (type, source) but
 *   the assembled notebook object is never checked for:
 *   - nbformat === 4
 *   - at least one code cell
 *   - at least one markdown cell
 *   - code cells have outputs: []
 *   If NotebookBuilderService.build() returns malformed JSON, it's
 *   silently returned to the frontend which may crash.
 *   Fix: Add validateNotebook() utility in Task 2.
 *
 * ISSUE-4 [MEDIUM]: Generic 500 error swallows all failure details.
 *   GenerateController catches all errors and rethrows as
 *   InternalServerErrorException("Generation failed. Please try again.")
 *   This loses the specific error reason (e.g., invalid API key vs timeout
 *   vs parse failure). Task 3 introduces a typed GenerationError with 422.
 *
 * ISSUE-5 [LOW]: No retry on malformed AI response.
 *   If OpenAI returns valid JSON but with 0 valid cells (all filtered out),
 *   the service throws immediately with no retry.
 *   Fix: Add one retry with corrective instruction in Task 3.
 */

import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

const fixturePath = path.join(__dirname, "../fixtures/sample-paper.pdf");

// ─── Mock cell sets ──────────────────────────────────────────────────────────

const VALID_CELLS = [
  { cell_type: "markdown", source: "# Intro\nThis paper presents a novel method." },
  { cell_type: "code", source: "!pip install numpy matplotlib" },
  { cell_type: "markdown", source: "## Methods\nWe use gradient descent." },
  { cell_type: "code", source: "import numpy as np\nresult = np.array([1,2,3])\nprint(result)" },
];

const MARKDOWN_ONLY_CELLS = [
  { cell_type: "markdown", source: "# Intro" },
  { cell_type: "markdown", source: "## Methods" },
];

const CODE_ONLY_CELLS = [
  { cell_type: "code", source: "import numpy as np" },
  { cell_type: "code", source: "print('done')" },
];

// ─── App factory ─────────────────────────────────────────────────────────────

async function createApp(mockCells: typeof VALID_CELLS) {
  const mockGenerateNotebook = vi.fn().mockResolvedValue(mockCells);
  const mockParse = vi.fn().mockResolvedValue({
    rawText: "Abstract This paper presents a novel method.",
    pageCount: 2,
    sections: [
      { title: "Abstract", content: "This paper presents a novel method." },
      { title: "1. Introduction", content: "Background and motivation." },
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

  const moduleFixture: TestingModule = await Test.createTestingModule({
    controllers: [GenerateController],
    providers: [
      GenerateService,
      PdfParserService,
      AiService,
      NotebookBuilderService,
      FigureExtractorService,
    ],
  })
    .overrideProvider(PdfParserService)
    .useValue({ parse: mockParse })
    .overrideProvider(AiService)
    .useValue({ generateNotebook: mockGenerateNotebook })
    .overrideProvider(FigureExtractorService)
    .useValue({ extract: vi.fn().mockResolvedValue([]) })
    .compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  await app.listen(0);
  const address = app.getHttpServer().address();
  const baseUrl = `http://localhost:${address.port}`;

  return { app, baseUrl, mockGenerateNotebook, mockParse };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("generate-engine: notebook structure validation", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    ({ app, baseUrl } = await createApp(VALID_CELLS));
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("returns HTTP 200 for a valid PDF + Bearer token", async () => {
    const pdfBuffer = fs.readFileSync(fixturePath);
    const formData = new FormData();
    formData.append("pdf", new Blob([pdfBuffer], { type: "application/pdf" }), "paper.pdf");

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test-engine" },
      body: formData,
    });

    expect(res.status).toBe(200);
  });

  it("response has nbformat: 4", async () => {
    const pdfBuffer = fs.readFileSync(fixturePath);
    const formData = new FormData();
    formData.append("pdf", new Blob([pdfBuffer], { type: "application/pdf" }), "paper.pdf");

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test-engine" },
      body: formData,
    });

    const body = await res.json();
    expect(body.nbformat).toBe(4);
  });

  it("response has a non-empty cells array", async () => {
    const pdfBuffer = fs.readFileSync(fixturePath);
    const formData = new FormData();
    formData.append("pdf", new Blob([pdfBuffer], { type: "application/pdf" }), "paper.pdf");

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test-engine" },
      body: formData,
    });

    const body = await res.json();
    expect(Array.isArray(body.cells)).toBe(true);
    expect(body.cells.length).toBeGreaterThan(0);
  });

  it("every cell has cell_type of 'code' or 'markdown'", async () => {
    const pdfBuffer = fs.readFileSync(fixturePath);
    const formData = new FormData();
    formData.append("pdf", new Blob([pdfBuffer], { type: "application/pdf" }), "paper.pdf");

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test-engine" },
      body: formData,
    });

    const body = await res.json();
    for (const cell of body.cells) {
      expect(["markdown", "code"]).toContain(cell.cell_type);
    }
  });

  it("every cell has a source field (string array)", async () => {
    const pdfBuffer = fs.readFileSync(fixturePath);
    const formData = new FormData();
    formData.append("pdf", new Blob([pdfBuffer], { type: "application/pdf" }), "paper.pdf");

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test-engine" },
      body: formData,
    });

    const body = await res.json();
    for (const cell of body.cells) {
      expect(Array.isArray(cell.source)).toBe(true);
      expect(cell.source.length).toBeGreaterThan(0);
    }
  });

  it("every code cell has execution_count: null and outputs: []", async () => {
    const pdfBuffer = fs.readFileSync(fixturePath);
    const formData = new FormData();
    formData.append("pdf", new Blob([pdfBuffer], { type: "application/pdf" }), "paper.pdf");

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test-engine" },
      body: formData,
    });

    const body = await res.json();
    const codeCells = body.cells.filter((c: any) => c.cell_type === "code");
    expect(codeCells.length).toBeGreaterThan(0);

    for (const cell of codeCells) {
      expect(cell.execution_count).toBeNull();
      expect(Array.isArray(cell.outputs)).toBe(true);
    }
  });

  it("notebook has at least one code cell and one markdown cell", async () => {
    const pdfBuffer = fs.readFileSync(fixturePath);
    const formData = new FormData();
    formData.append("pdf", new Blob([pdfBuffer], { type: "application/pdf" }), "paper.pdf");

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test-engine" },
      body: formData,
    });

    const body = await res.json();
    const hasCode = body.cells.some((c: any) => c.cell_type === "code");
    const hasMarkdown = body.cells.some((c: any) => c.cell_type === "markdown");
    expect(hasCode).toBe(true);
    expect(hasMarkdown).toBe(true);
  });

  it("notebook has kernelspec metadata with language: python", async () => {
    const pdfBuffer = fs.readFileSync(fixturePath);
    const formData = new FormData();
    formData.append("pdf", new Blob([pdfBuffer], { type: "application/pdf" }), "paper.pdf");

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test-engine" },
      body: formData,
    });

    const body = await res.json();
    expect(body.metadata?.kernelspec?.language).toBe("python");
  });

  it("returns 400 when no file is provided", async () => {
    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test" },
      body: new FormData(),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when Authorization header is missing", async () => {
    const pdfBuffer = fs.readFileSync(fixturePath);
    const formData = new FormData();
    formData.append("pdf", new Blob([pdfBuffer], { type: "application/pdf" }), "paper.pdf");

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      body: formData,
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when Authorization header is not Bearer format", async () => {
    const pdfBuffer = fs.readFileSync(fixturePath);
    const formData = new FormData();
    formData.append("pdf", new Blob([pdfBuffer], { type: "application/pdf" }), "paper.pdf");

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Basic sk-test" },
      body: formData,
    });
    expect(res.status).toBe(400);
  });
});

// ─── Edge case: markdown-only cells ─────────────────────────────────────────

describe("generate-engine: markdown-only cells detection (ISSUE-3)", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    ({ app, baseUrl } = await createApp(MARKDOWN_ONLY_CELLS as any));
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("returns a notebook even when AI returns only markdown cells (no code cells)", async () => {
    // NOTE: This documents ISSUE-3 — the engine does NOT currently enforce
    // "at least one code cell". Task 2 will add validateNotebook() which
    // will catch this and either throw or pad with a placeholder code cell.
    const pdfBuffer = fs.readFileSync(fixturePath);
    const formData = new FormData();
    formData.append("pdf", new Blob([pdfBuffer], { type: "application/pdf" }), "paper.pdf");

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test" },
      body: formData,
    });

    // Currently returns 200 even with markdown-only (no validation) — ISSUE-3
    expect(res.status).toBe(200);
    const body = await res.json();
    const hasCode = body.cells.some((c: any) => c.cell_type === "code");
    // This assertion WILL pass currently because no validation exists.
    // After Task 2, we expect this case to return a 422 or include a placeholder code cell.
    expect(hasCode).toBe(false); // documents current (broken) behavior
  });
});

// ─── Edge case: code-only cells ──────────────────────────────────────────────

describe("generate-engine: code-only cells detection (ISSUE-3)", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    ({ app, baseUrl } = await createApp(CODE_ONLY_CELLS as any));
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("returns a notebook even when AI returns only code cells (no markdown)", async () => {
    // Documents ISSUE-3 — currently no enforcement of "at least one markdown cell"
    const pdfBuffer = fs.readFileSync(fixturePath);
    const formData = new FormData();
    formData.append("pdf", new Blob([pdfBuffer], { type: "application/pdf" }), "paper.pdf");

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test" },
      body: formData,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const hasMarkdown = body.cells.some((c: any) => c.cell_type === "markdown");
    expect(hasMarkdown).toBe(false); // documents current (broken) behavior
  });
});
