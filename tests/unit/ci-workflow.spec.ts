import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import yaml from "yaml";

const ciPath = path.join(
  __dirname,
  "../../.github/workflows/ci.yml"
);

describe("CI Workflow (ci.yml)", () => {
  let config: any;

  it("ci.yml file exists", () => {
    expect(fs.existsSync(ciPath)).toBe(true);
  });

  it("is valid YAML", () => {
    const raw = fs.readFileSync(ciPath, "utf-8");
    config = yaml.parse(raw);
    expect(config).toBeDefined();
  });

  it("triggers on push and pull_request", () => {
    const raw = fs.readFileSync(ciPath, "utf-8");
    config = yaml.parse(raw);
    expect(config.on).toHaveProperty("push");
    expect(config.on).toHaveProperty("pull_request");
  });

  it("has test and security jobs", () => {
    const raw = fs.readFileSync(ciPath, "utf-8");
    config = yaml.parse(raw);
    expect(config.jobs).toHaveProperty("test");
    expect(config.jobs).toHaveProperty("security");
  });

  it("test job uses Node.js 20", () => {
    const raw = fs.readFileSync(ciPath, "utf-8");
    config = yaml.parse(raw);
    const testJob = config.jobs.test;
    const setupNode = testJob.steps.find(
      (s: any) => s.uses && s.uses.includes("setup-node")
    );
    expect(setupNode).toBeDefined();
    expect(String(setupNode.with["node-version"])).toBe("20");
  });

  it("test job runs vitest and playwright", () => {
    const raw = fs.readFileSync(ciPath, "utf-8");
    config = yaml.parse(raw);
    const testJob = config.jobs.test;
    const steps = testJob.steps.map((s: any) => s.run || "").join("\n");
    expect(steps).toContain("vitest");
    expect(steps).toContain("playwright");
  });

  it("security job runs semgrep and npm audit", () => {
    const raw = fs.readFileSync(ciPath, "utf-8");
    config = yaml.parse(raw);
    const secJob = config.jobs.security;
    const steps = secJob.steps.map((s: any) => s.run || "").join("\n");
    expect(steps).toContain("semgrep");
    expect(steps).toContain("npm audit");
  });

  it("does NOT include quality-test (requires real API key)", () => {
    const raw = fs.readFileSync(ciPath, "utf-8");
    expect(raw).not.toContain("quality-test");
    expect(raw).not.toContain("OPENAI_API_KEY");
  });
});
