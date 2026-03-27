import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

let app: INestApplication;
let baseUrl: string;

describe("Rate limiting (@nestjs/throttler)", () => {
  beforeAll(async () => {
    const { AppModule } = await import("../../apps/api/src/app.module");
    const { AiService } = await import("../../apps/api/src/ai/ai.service");

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AiService)
      .useValue({ generateNotebook: () => [] })
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

  it("returns 429 after exceeding rate limit on /generate", async () => {
    // Send 11 requests rapidly (limit is 10 per 60s)
    const results: number[] = [];
    for (let i = 0; i < 12; i++) {
      const formData = new FormData();
      formData.append(
        "pdf",
        new Blob(["%PDF-1.4 minimal"], { type: "application/pdf" }),
        "test.pdf"
      );
      formData.append("apiKey", "sk-test");
      const res = await fetch(`${baseUrl}/generate`, {
        method: "POST",
        body: formData,
      });
      results.push(res.status);
    }

    expect(results).toContain(429);
  });

  it("does not rate-limit the /health endpoint", async () => {
    // Send 15 requests to health — should all succeed
    const results: number[] = [];
    for (let i = 0; i < 15; i++) {
      const res = await fetch(`${baseUrl}/health`);
      results.push(res.status);
    }

    expect(results.every((s) => s === 200)).toBe(true);
  });
});
