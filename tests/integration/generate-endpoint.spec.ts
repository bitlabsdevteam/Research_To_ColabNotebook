import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

let app: INestApplication;
let baseUrl: string;
let mockGenerateNotebook: ReturnType<typeof vi.fn>;

const mockCells = [
  { cell_type: "markdown", source: "# Tutorial" },
  { cell_type: "code", source: "print('hello')" },
];

describe("POST /generate — validation", () => {
  beforeAll(async () => {
    mockGenerateNotebook = vi.fn().mockResolvedValue(mockCells);

    const { GenerateModule } = await import(
      "../../apps/api/src/generate/generate.module"
    );
    const { AiService } = await import("../../apps/api/src/ai/ai.service");

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [GenerateModule],
    })
      .overrideProvider(AiService)
      .useValue({
        generateNotebook: mockGenerateNotebook,
      })
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

  it("returns 400 when no file is uploaded", async () => {
    const formData = new FormData();

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test" },
      body: formData,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/pdf/i);
  });

  it("returns 400 when Authorization header is missing", async () => {
    const pdfBuffer = createMinimalPdf();
    const formData = new FormData();
    formData.append(
      "pdf",
      new Blob([pdfBuffer], { type: "application/pdf" }),
      "test.pdf"
    );

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      body: formData,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/apiKey/i);
  });

  it("returns 400 when file is not a PDF", async () => {
    const formData = new FormData();
    formData.append(
      "pdf",
      new Blob(["not a pdf"], { type: "text/plain" }),
      "test.txt"
    );

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test" },
      body: formData,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/pdf/i);
  });

  it("accepts a valid PDF with Authorization header and returns 200", async () => {
    const pdfBuffer = createMinimalPdf();
    const formData = new FormData();
    formData.append(
      "pdf",
      new Blob([pdfBuffer], { type: "application/pdf" }),
      "paper.pdf"
    );

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer sk-test-key-12345" },
      body: formData,
    });
    expect(res.status).toBe(200);
  });

  it("returns valid .ipynb structure with nbformat and cells", async () => {
    mockGenerateNotebook.mockResolvedValueOnce(mockCells);

    const pdfBuffer = createMinimalPdf();
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
    expect(body.nbformat).toBe(4);
    expect(body.metadata).toHaveProperty("colab");
    expect(body.metadata).toHaveProperty("kernelspec");
    expect(body.metadata.kernelspec.language).toBe("python");
    expect(Array.isArray(body.cells)).toBe(true);
    expect(body.cells.length).toBeGreaterThanOrEqual(2);
  });

  it("returns 500 with generic message when AI service fails", async () => {
    mockGenerateNotebook.mockRejectedValueOnce(
      new Error("OpenAI API rate limit for org-secret")
    );

    const pdfBuffer = createMinimalPdf();
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

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toContain("Generation failed");
    // Must NOT leak internal error details
    expect(body.message).not.toContain("OpenAI");
    expect(body.message).not.toContain("org-secret");
  });

  it("returns 400 when Bearer token is empty (just 'Bearer ')", async () => {
    const pdfBuffer = createMinimalPdf();
    const formData = new FormData();
    formData.append(
      "pdf",
      new Blob([pdfBuffer], { type: "application/pdf" }),
      "paper.pdf"
    );

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Bearer " },
      body: formData,
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when Authorization uses wrong scheme (Basic instead of Bearer)", async () => {
    const pdfBuffer = createMinimalPdf();
    const formData = new FormData();
    formData.append(
      "pdf",
      new Blob([pdfBuffer], { type: "application/pdf" }),
      "paper.pdf"
    );

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: "Basic sk-test-key" },
      body: formData,
    });

    expect(res.status).toBe(400);
  });
});

function createMinimalPdf(): Buffer {
  return Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n109\n%%EOF"
  );
}
