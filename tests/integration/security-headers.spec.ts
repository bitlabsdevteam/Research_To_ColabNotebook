import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import helmet from "helmet";

let app: INestApplication;
let baseUrl: string;

describe("Security headers (helmet)", () => {
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
    app.use(helmet());
    await app.init();
    await app.listen(0);
    const address = app.getHttpServer().address();
    baseUrl = `http://localhost:${address.port}`;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("sets X-Content-Type-Options: nosniff", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("sets X-Frame-Options header", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
  });

  it("removes X-Powered-By header", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.headers.get("x-powered-by")).toBeNull();
  });
});
