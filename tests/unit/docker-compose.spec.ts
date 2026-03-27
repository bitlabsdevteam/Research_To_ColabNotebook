import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import yaml from "yaml";

const composePath = path.join(__dirname, "../../docker-compose.yml");
const envDockerPath = path.join(__dirname, "../../.env.docker");

describe("docker-compose.yml", () => {
  let config: any;

  it("exists and is valid YAML", () => {
    expect(fs.existsSync(composePath)).toBe(true);
    const raw = fs.readFileSync(composePath, "utf-8");
    config = yaml.parse(raw);
    expect(config).toBeDefined();
  });

  it("defines backend and frontend services", () => {
    const raw = fs.readFileSync(composePath, "utf-8");
    config = yaml.parse(raw);
    expect(config.services).toHaveProperty("backend");
    expect(config.services).toHaveProperty("frontend");
  });

  it("backend builds from apps/api/Dockerfile", () => {
    const raw = fs.readFileSync(composePath, "utf-8");
    config = yaml.parse(raw);
    const backend = config.services.backend;
    expect(backend.build.dockerfile).toMatch(/apps\/api/);
  });

  it("backend exposes port 3001", () => {
    const raw = fs.readFileSync(composePath, "utf-8");
    config = yaml.parse(raw);
    const backend = config.services.backend;
    const ports = backend.ports.map(String);
    expect(ports.some((p: string) => p.includes("3001"))).toBe(true);
  });

  it("backend has CORS_ORIGIN env var", () => {
    const raw = fs.readFileSync(composePath, "utf-8");
    config = yaml.parse(raw);
    const backend = config.services.backend;
    const envKeys = Object.keys(backend.environment || {});
    expect(envKeys).toContain("CORS_ORIGIN");
  });

  it("backend has a healthcheck", () => {
    const raw = fs.readFileSync(composePath, "utf-8");
    config = yaml.parse(raw);
    const backend = config.services.backend;
    expect(backend.healthcheck).toBeDefined();
    expect(backend.healthcheck.test).toBeDefined();
  });

  it("frontend builds from apps/web/Dockerfile", () => {
    const raw = fs.readFileSync(composePath, "utf-8");
    config = yaml.parse(raw);
    const frontend = config.services.frontend;
    expect(frontend.build.dockerfile).toMatch(/apps\/web/);
  });

  it("frontend exposes port 3000", () => {
    const raw = fs.readFileSync(composePath, "utf-8");
    config = yaml.parse(raw);
    const frontend = config.services.frontend;
    const ports = frontend.ports.map(String);
    expect(ports.some((p: string) => p.includes("3000"))).toBe(true);
  });

  it("frontend has NEXT_PUBLIC_API_URL env var", () => {
    const raw = fs.readFileSync(composePath, "utf-8");
    config = yaml.parse(raw);
    const frontend = config.services.frontend;
    const envKeys = Object.keys(frontend.environment || {});
    expect(envKeys).toContain("NEXT_PUBLIC_API_URL");
  });

  it("frontend depends on backend", () => {
    const raw = fs.readFileSync(composePath, "utf-8");
    config = yaml.parse(raw);
    const frontend = config.services.frontend;
    expect(frontend.depends_on).toBeDefined();
  });
});

describe(".env.docker", () => {
  it("exists", () => {
    expect(fs.existsSync(envDockerPath)).toBe(true);
  });

  it("documents CORS_ORIGIN and NEXT_PUBLIC_API_URL", () => {
    const content = fs.readFileSync(envDockerPath, "utf-8");
    expect(content).toContain("CORS_ORIGIN");
    expect(content).toContain("NEXT_PUBLIC_API_URL");
  });
});
