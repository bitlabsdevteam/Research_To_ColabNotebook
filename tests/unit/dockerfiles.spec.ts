import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const apiDockerfile = path.join(__dirname, "../../apps/api/Dockerfile");
const webDockerfile = path.join(__dirname, "../../apps/web/Dockerfile");

describe("Backend Dockerfile (apps/api/Dockerfile)", () => {
  let content: string;

  it("exists", () => {
    expect(fs.existsSync(apiDockerfile)).toBe(true);
    content = fs.readFileSync(apiDockerfile, "utf-8");
  });

  it("uses multi-stage build", () => {
    content = fs.readFileSync(apiDockerfile, "utf-8");
    const fromCount = (content.match(/^FROM /gm) || []).length;
    expect(fromCount).toBeGreaterThanOrEqual(2);
  });

  it("uses Node 20 Alpine base", () => {
    content = fs.readFileSync(apiDockerfile, "utf-8");
    expect(content).toMatch(/FROM node:20.*alpine/i);
  });

  it("exposes port 3001", () => {
    content = fs.readFileSync(apiDockerfile, "utf-8");
    expect(content).toContain("EXPOSE 3001");
  });

  it("runs node dist/main", () => {
    content = fs.readFileSync(apiDockerfile, "utf-8");
    expect(content).toMatch(/dist\/main/);
  });

  it("copies dist and installs production deps in final stage", () => {
    content = fs.readFileSync(apiDockerfile, "utf-8");
    expect(content).toMatch(/COPY.*dist/);
    // Production deps via npm ci --omit=dev or COPY node_modules
    expect(content).toMatch(/npm ci.*--omit=dev|COPY.*node_modules/);
  });
});

describe("Frontend Dockerfile (apps/web/Dockerfile)", () => {
  let content: string;

  it("exists", () => {
    expect(fs.existsSync(webDockerfile)).toBe(true);
    content = fs.readFileSync(webDockerfile, "utf-8");
  });

  it("uses multi-stage build", () => {
    content = fs.readFileSync(webDockerfile, "utf-8");
    const fromCount = (content.match(/^FROM /gm) || []).length;
    expect(fromCount).toBeGreaterThanOrEqual(2);
  });

  it("uses Node 20 Alpine base", () => {
    content = fs.readFileSync(webDockerfile, "utf-8");
    expect(content).toMatch(/FROM node:20.*alpine/i);
  });

  it("exposes port 3000", () => {
    content = fs.readFileSync(webDockerfile, "utf-8");
    expect(content).toContain("EXPOSE 3000");
  });

  it("runs next start or standalone server", () => {
    content = fs.readFileSync(webDockerfile, "utf-8");
    expect(content).toMatch(/server\.js|next start/);
  });
});
