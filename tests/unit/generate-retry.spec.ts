/**
 * Task 3 (v6): Harden /generate — timeout, retry, GenerationError → 422
 *
 * Tests:
 * A) GenerateService retry logic — bad first attempt, good second → succeeds
 * B) GenerateService retry logic — both attempts fail → throws GenerationError
 * C) GenerateService — AI timeout throws GenerationError
 * D) GenerateController — GenerationError → HTTP 422 with { error: "..." }
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_NOTEBOOK = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: { kernelspec: { language: "python" } },
  cells: [
    { cell_type: "markdown", source: ["# Tutorial"], metadata: {} },
    { cell_type: "code", source: ["print('hi')"], metadata: {}, execution_count: null, outputs: [] },
  ],
};

// Invalid: code cell missing outputs
const INVALID_NOTEBOOK = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {},
  cells: [
    { cell_type: "code", source: ["print('hi')"], metadata: {} }, // missing outputs
  ],
};

const VALID_CELLS = [
  { cell_type: "markdown", source: "# Tutorial" },
  { cell_type: "code", source: "print('hi')" },
];

const fakeParsed = {
  rawText: "A novel algorithm.",
  pageCount: 2,
  sections: [{ title: "Abstract", content: "A novel algorithm." }],
};

// ─── Part A & B: GenerateService retry logic ─────────────────────────────────

describe("GenerateService — retry logic", () => {
  let GenerateService: any;
  let GenerationError: any;
  let mockParse: ReturnType<typeof vi.fn>;
  let mockExtract: ReturnType<typeof vi.fn>;
  let mockGenerateNotebook: ReturnType<typeof vi.fn>;
  let mockBuild: ReturnType<typeof vi.fn>;
  let service: any;

  beforeEach(async () => {
    vi.resetModules();
    mockParse = vi.fn().mockResolvedValue(fakeParsed);
    mockExtract = vi.fn().mockResolvedValue([]);
    mockGenerateNotebook = vi.fn();
    mockBuild = vi.fn();

    const mod = await import("../../apps/api/src/generate/generate.service");
    const errMod = await import("../../apps/api/src/generate/generation-error");
    GenerateService = mod.GenerateService;
    GenerationError = errMod.GenerationError;

    service = new GenerateService(
      { parse: mockParse },
      { extract: mockExtract },
      { generateNotebook: mockGenerateNotebook },
      { build: mockBuild }
    );
  });

  it("succeeds on first attempt when notebook is valid", async () => {
    mockGenerateNotebook.mockResolvedValue(VALID_CELLS);
    mockBuild.mockReturnValue(VALID_NOTEBOOK);

    const result = await service.generate(Buffer.from("pdf"), "sk-test");
    expect(result).toEqual(VALID_NOTEBOOK);
    expect(mockGenerateNotebook).toHaveBeenCalledTimes(1);
  });

  it("retries when first notebook fails validation, succeeds on second", async () => {
    mockGenerateNotebook.mockResolvedValue(VALID_CELLS);
    // First build returns invalid, second returns valid
    mockBuild
      .mockReturnValueOnce(INVALID_NOTEBOOK)
      .mockReturnValueOnce(VALID_NOTEBOOK);

    const result = await service.generate(Buffer.from("pdf"), "sk-test");
    expect(result).toEqual(VALID_NOTEBOOK);
    expect(mockGenerateNotebook).toHaveBeenCalledTimes(2);
  });

  it("passes corrective instruction on retry attempt", async () => {
    mockGenerateNotebook.mockResolvedValue(VALID_CELLS);
    mockBuild
      .mockReturnValueOnce(INVALID_NOTEBOOK)
      .mockReturnValueOnce(VALID_NOTEBOOK);

    await service.generate(Buffer.from("pdf"), "sk-test");

    // Second call should include a retryInstruction parameter
    const secondCallArgs = mockGenerateNotebook.mock.calls[1];
    // The retry instruction should be the 4th argument (after sections, figures, apiKey)
    expect(secondCallArgs[3]).toMatch(/valid JSON/i);
  });

  it("throws GenerationError when both attempts fail validation", async () => {
    mockGenerateNotebook.mockResolvedValue(VALID_CELLS);
    mockBuild.mockReturnValue(INVALID_NOTEBOOK); // always invalid

    await expect(service.generate(Buffer.from("pdf"), "sk-test")).rejects.toThrow(
      GenerationError
    );
    await expect(service.generate(Buffer.from("pdf"), "sk-test")).rejects.toThrow(
      /Failed to generate a valid notebook after 2 attempts/
    );
    expect(mockGenerateNotebook).toHaveBeenCalledTimes(4); // 2 calls × 2 invocations
  });

  it("retries when AI throws on first attempt, succeeds on second", async () => {
    mockGenerateNotebook
      .mockRejectedValueOnce(new Error("OpenAI timeout"))
      .mockResolvedValueOnce(VALID_CELLS);
    mockBuild.mockReturnValue(VALID_NOTEBOOK);

    const result = await service.generate(Buffer.from("pdf"), "sk-test");
    expect(result).toEqual(VALID_NOTEBOOK);
    expect(mockGenerateNotebook).toHaveBeenCalledTimes(2);
  });

  it("throws GenerationError when AI throws on both attempts", async () => {
    mockGenerateNotebook.mockRejectedValue(new Error("OpenAI timeout"));

    await expect(service.generate(Buffer.from("pdf"), "sk-test")).rejects.toThrow(
      GenerationError
    );
    await expect(service.generate(Buffer.from("pdf"), "sk-test")).rejects.toThrow(
      /Failed to generate a valid notebook after 2 attempts/
    );
  });

  it("does NOT retry on PDF parse errors (only AI/validation failures)", async () => {
    mockParse.mockRejectedValue(new Error("PDF parse failed"));

    await expect(service.generate(Buffer.from("pdf"), "sk-test")).rejects.toThrow(
      "PDF parse failed"
    );
    // parse should only be called once — no retry for PDF errors
    expect(mockParse).toHaveBeenCalledTimes(1);
    expect(mockGenerateNotebook).not.toHaveBeenCalled();
  });
});

// ─── Part C: AiService timeout (source-level verification) ───────────────────
// Behavioral tests for the OpenAI client mock are in ai.service.spec.ts
// which uses top-level vi.mock hoisting. Here we just verify the source
// constants are correct.

describe("AiService — source-level timeout verification", () => {
  it("AiService source uses AbortController for timeout", async () => {
    const src = await import("fs").then((fs) =>
      fs.readFileSync(
        new URL("../../apps/api/src/ai/ai.service.ts", import.meta.url),
        "utf-8"
      )
    );
    expect(src).toContain("AbortController");
    expect(src).toContain("OPENAI_TIMEOUT_MS");
  });

  it("AiService source uses gpt-4o (not gpt-5.4)", async () => {
    const src = await import("fs").then((fs) =>
      fs.readFileSync(
        new URL("../../apps/api/src/ai/ai.service.ts", import.meta.url),
        "utf-8"
      )
    );
    expect(src).toContain("gpt-4o");
    expect(src).not.toContain("gpt-5.4");
  });

  it("AiService source passes signal option to OpenAI create call", async () => {
    const src = await import("fs").then((fs) =>
      fs.readFileSync(
        new URL("../../apps/api/src/ai/ai.service.ts", import.meta.url),
        "utf-8"
      )
    );
    expect(src).toContain("signal");
    expect(src).toContain("controller.signal");
  });
});

// ─── Part D: Controller → 422 on GenerationError ─────────────────────────────

describe("GenerateController — 422 on GenerationError", () => {
  let app: INestApplication;
  let baseUrl: string;

  const fixturePath = path.join(__dirname, "../fixtures/sample-paper.pdf");

  beforeEach(async () => {
    vi.resetModules();

    const { GenerationError } = await import(
      "../../apps/api/src/generate/generation-error"
    );
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
      .overrideProvider(GenerateService)
      .useValue({
        generate: vi
          .fn()
          .mockRejectedValue(
            new GenerationError("Failed to generate a valid notebook after 2 attempts")
          ),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0);
    const address = app.getHttpServer().address();
    baseUrl = `http://localhost:${address.port}`;
  });

  it("returns HTTP 422 when GenerationError is thrown", async () => {
    const pdfBuffer = fs.readFileSync(fixturePath);
    const formData = new FormData();
    formData.append("pdf", new Blob([pdfBuffer], { type: "application/pdf" }), "paper.pdf");

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test" },
      body: formData,
    });

    expect(res.status).toBe(422);
  });

  it("422 response body has { error: string } shape", async () => {
    const pdfBuffer = fs.readFileSync(fixturePath);
    const formData = new FormData();
    formData.append("pdf", new Blob([pdfBuffer], { type: "application/pdf" }), "paper.pdf");

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test" },
      body: formData,
    });

    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
    expect(body.error).toMatch(/2 attempts/);
  });

  afterEach(async () => {
    if (app) await app.close();
  });
});
