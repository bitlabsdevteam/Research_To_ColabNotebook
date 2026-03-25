import { describe, it, expect, beforeAll } from "vitest";

let NotebookBuilderService: any;
let service: any;

beforeAll(async () => {
  const mod = await import(
    "../../apps/api/src/notebook/notebook-builder.service"
  );
  NotebookBuilderService = mod.NotebookBuilderService;
  service = new NotebookBuilderService();
});

const sampleCells = [
  {
    cell_type: "markdown" as const,
    source: "# QuantumSort Tutorial\nImplementing the paper's algorithms.",
  },
  {
    cell_type: "code" as const,
    source: "import numpy as np\n\ndef quantum_sort(arr):\n    pass",
  },
  {
    cell_type: "markdown" as const,
    source: "## Results\nLet's benchmark.",
  },
  {
    cell_type: "code" as const,
    source: 'arr = [5, 3, 1, 4, 2]\nresult = quantum_sort(arr)\nprint(result)',
  },
];

describe("NotebookBuilderService", () => {
  it("produces valid nbformat 4 structure", () => {
    const notebook = service.build(sampleCells);

    expect(notebook.nbformat).toBe(4);
    expect(notebook.nbformat_minor).toBeGreaterThanOrEqual(0);
    expect(notebook).toHaveProperty("metadata");
    expect(notebook).toHaveProperty("cells");
    expect(Array.isArray(notebook.cells)).toBe(true);
  });

  it("includes Colab metadata", () => {
    const notebook = service.build(sampleCells);

    expect(notebook.metadata).toHaveProperty("colab");
    expect(notebook.metadata.colab).toHaveProperty("name");
    expect(notebook.metadata).toHaveProperty("kernelspec");
    expect(notebook.metadata.kernelspec.language).toBe("python");
  });

  it("converts markdown cells with correct format", () => {
    const notebook = service.build(sampleCells);

    const mdCell = notebook.cells[0];
    expect(mdCell.cell_type).toBe("markdown");
    expect(mdCell.metadata).toBeDefined();
    expect(Array.isArray(mdCell.source)).toBe(true);
    // nbformat requires source as array of strings (lines)
    expect(mdCell.source.join("")).toContain("QuantumSort");
  });

  it("converts code cells with execution count and outputs", () => {
    const notebook = service.build(sampleCells);

    const codeCell = notebook.cells[1];
    expect(codeCell.cell_type).toBe("code");
    expect(codeCell.execution_count).toBeNull();
    expect(Array.isArray(codeCell.outputs)).toBe(true);
    expect(codeCell.outputs).toHaveLength(0);
    expect(Array.isArray(codeCell.source)).toBe(true);
    expect(codeCell.source.join("")).toContain("quantum_sort");
  });

  it("preserves the correct number of cells", () => {
    const notebook = service.build(sampleCells);
    expect(notebook.cells).toHaveLength(4);
  });

  it("embeds figures as base64 in markdown cells", () => {
    const figures = [
      { page: 1, base64: "iVBORw0KGgoAAAANS..." },
    ];
    const notebook = service.build(sampleCells, figures);

    // Should have an extra markdown cell for the figure
    const figureCells = notebook.cells.filter(
      (c: any) =>
        c.cell_type === "markdown" &&
        c.source.join("").includes("data:image/png;base64")
    );
    expect(figureCells.length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty cells array", () => {
    const notebook = service.build([]);
    expect(notebook.cells).toHaveLength(0);
    expect(notebook.nbformat).toBe(4);
  });

  it("produces valid JSON string via toJson", () => {
    const json = service.toJson(sampleCells);
    expect(typeof json).toBe("string");
    const parsed = JSON.parse(json);
    expect(parsed.nbformat).toBe(4);
    expect(parsed.cells).toHaveLength(4);
  });
});
