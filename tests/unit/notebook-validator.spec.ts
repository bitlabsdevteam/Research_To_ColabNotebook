import { describe, it, expect } from "vitest";
import { validateNotebook } from "../../apps/api/src/generate/notebook-validator";

// ─── Valid notebook fixture ───────────────────────────────────────────────────

const VALID_NOTEBOOK = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: { kernelspec: { name: "python3" } },
  cells: [
    {
      cell_type: "markdown",
      source: ["# Title\n", "Introduction paragraph."],
      metadata: {},
    },
    {
      cell_type: "code",
      source: ["!pip install numpy\n"],
      metadata: {},
      execution_count: null,
      outputs: [],
    },
    {
      cell_type: "markdown",
      source: ["## Section 2"],
      metadata: {},
    },
    {
      cell_type: "code",
      source: ["import numpy as np\n", "print(np.__version__)"],
      metadata: {},
      execution_count: null,
      outputs: [],
    },
  ],
};

// ─── Valid notebook (source as plain string) ──────────────────────────────────

const VALID_STRING_SOURCE = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {},
  cells: [
    { cell_type: "markdown", source: "# Hello", metadata: {} },
    { cell_type: "code", source: "print('hi')", metadata: {}, execution_count: null, outputs: [] },
  ],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("validateNotebook — valid cases", () => {
  it("returns valid: true for a well-formed notebook with array sources", () => {
    const result = validateNotebook(VALID_NOTEBOOK);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid: true when source is a plain string", () => {
    const result = validateNotebook(VALID_STRING_SOURCE);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid: true with only markdown cells (no code cells required)", () => {
    const nb = {
      ...VALID_NOTEBOOK,
      cells: [
        { cell_type: "markdown", source: ["# Only markdown"], metadata: {} },
      ],
    };
    const result = validateNotebook(nb);
    expect(result.valid).toBe(true);
  });
});

describe("validateNotebook — nbformat checks", () => {
  it("returns error when nbformat is missing", () => {
    const nb = { ...VALID_NOTEBOOK, nbformat: undefined };
    const result = validateNotebook(nb);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("nbformat"))).toBe(true);
  });

  it("returns error when nbformat is not 4", () => {
    const nb = { ...VALID_NOTEBOOK, nbformat: 3 };
    const result = validateNotebook(nb);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("nbformat"))).toBe(true);
  });

  it("returns error when nbformat is a string '4'", () => {
    const nb = { ...VALID_NOTEBOOK, nbformat: "4" };
    const result = validateNotebook(nb);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("nbformat"))).toBe(true);
  });
});

describe("validateNotebook — cells array checks", () => {
  it("returns error when cells is missing", () => {
    const nb = { nbformat: 4, nbformat_minor: 5, metadata: {} };
    const result = validateNotebook(nb);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("cells"))).toBe(true);
  });

  it("returns error when cells is not an array", () => {
    const nb = { ...VALID_NOTEBOOK, cells: {} };
    const result = validateNotebook(nb);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("cells"))).toBe(true);
  });

  it("returns error when cells is an empty array", () => {
    const nb = { ...VALID_NOTEBOOK, cells: [] };
    const result = validateNotebook(nb);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("cells"))).toBe(true);
  });
});

describe("validateNotebook — cell_type checks", () => {
  it("returns error when a cell has invalid cell_type", () => {
    const nb = {
      ...VALID_NOTEBOOK,
      cells: [
        ...VALID_NOTEBOOK.cells,
        { cell_type: "raw", source: ["some raw"], metadata: {} },
      ],
    };
    const result = validateNotebook(nb);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("cell_type"))).toBe(true);
  });

  it("returns error when a cell has missing cell_type", () => {
    const nb = {
      ...VALID_NOTEBOOK,
      cells: [
        { source: ["# Title"], metadata: {} },
        ...VALID_NOTEBOOK.cells.slice(1),
      ],
    };
    const result = validateNotebook(nb);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("cell_type"))).toBe(true);
  });
});

describe("validateNotebook — source checks", () => {
  it("returns error when a cell has no source field", () => {
    const nb = {
      ...VALID_NOTEBOOK,
      cells: [
        { cell_type: "markdown", metadata: {} },
        ...VALID_NOTEBOOK.cells.slice(1),
      ],
    };
    const result = validateNotebook(nb);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("source"))).toBe(true);
  });

  it("returns error when source is null", () => {
    const nb = {
      ...VALID_NOTEBOOK,
      cells: [
        { cell_type: "markdown", source: null, metadata: {} },
        ...VALID_NOTEBOOK.cells.slice(1),
      ],
    };
    const result = validateNotebook(nb);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("source"))).toBe(true);
  });

  it("returns error when source is a number", () => {
    const nb = {
      ...VALID_NOTEBOOK,
      cells: [
        { cell_type: "markdown", source: 42, metadata: {} },
        ...VALID_NOTEBOOK.cells.slice(1),
      ],
    };
    const result = validateNotebook(nb);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("source"))).toBe(true);
  });
});

describe("validateNotebook — code cell outputs checks", () => {
  it("returns error when a code cell is missing outputs", () => {
    const nb = {
      ...VALID_NOTEBOOK,
      cells: [
        VALID_NOTEBOOK.cells[0],
        { cell_type: "code", source: ["print('hi')"], metadata: {} }, // no outputs field
      ],
    };
    const result = validateNotebook(nb);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("outputs"))).toBe(true);
  });

  it("returns error when code cell outputs is not an array", () => {
    const nb = {
      ...VALID_NOTEBOOK,
      cells: [
        VALID_NOTEBOOK.cells[0],
        { cell_type: "code", source: ["print('hi')"], metadata: {}, outputs: "none" },
      ],
    };
    const result = validateNotebook(nb);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("outputs"))).toBe(true);
  });

  it("does NOT require outputs on markdown cells", () => {
    const nb = {
      ...VALID_NOTEBOOK,
      cells: [{ cell_type: "markdown", source: ["# Hello"], metadata: {} }],
    };
    const result = validateNotebook(nb);
    expect(result.valid).toBe(true);
  });
});

describe("validateNotebook — completely invalid inputs", () => {
  it("returns error when input is null", () => {
    const result = validateNotebook(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns error when input is a string", () => {
    const result = validateNotebook("not a notebook");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns error when input is an array", () => {
    // Some broken AI responses return a bare cell array instead of a notebook object
    const result = validateNotebook([{ cell_type: "markdown", source: "hi" }]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("accumulates multiple errors rather than stopping at first", () => {
    // nbformat wrong AND cells missing
    const result = validateNotebook({ nbformat: 3, metadata: {} });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
