import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const scriptPath = path.join(__dirname, "../../scripts/setup-github.sh");

describe("scripts/setup-github.sh", () => {
  it("exists", () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  it("is executable (has shebang)", () => {
    const content = fs.readFileSync(scriptPath, "utf-8");
    expect(content.startsWith("#!/")).toBe(true);
  });

  it("uses gh CLI for branch protection", () => {
    const content = fs.readFileSync(scriptPath, "utf-8");
    expect(content).toContain("gh api");
    expect(content).toMatch(/protection/);
  });

  it("targets main branch", () => {
    const content = fs.readFileSync(scriptPath, "utf-8");
    expect(content).toContain("main");
  });

  it("requires CI checks to pass", () => {
    const content = fs.readFileSync(scriptPath, "utf-8");
    expect(content).toMatch(/required_status_checks|status.*check/i);
  });

  it("has explanatory comments", () => {
    const content = fs.readFileSync(scriptPath, "utf-8");
    const commentLines = content
      .split("\n")
      .filter((l) => l.trimStart().startsWith("#"));
    expect(commentLines.length).toBeGreaterThanOrEqual(5);
  });

  it("includes error handling (set -e or similar)", () => {
    const content = fs.readFileSync(scriptPath, "utf-8");
    expect(content).toMatch(/set -e|set -o errexit/);
  });
});
