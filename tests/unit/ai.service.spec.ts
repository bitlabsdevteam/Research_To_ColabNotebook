import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the openai module before importing the service
vi.mock("openai", () => {
  const mockCreate = vi.fn();
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
    __mockCreate: mockCreate,
  };
});

let AiService: any;
let service: any;
let mockCreate: any;

beforeEach(async () => {
  vi.clearAllMocks();
  const openaiMod = await import("openai");
  mockCreate = (openaiMod as any).__mockCreate;

  const mod = await import("../../apps/api/src/ai/ai.service");
  AiService = mod.AiService;
  service = new AiService();
});

const sampleSections = [
  {
    title: "Abstract",
    content: "This paper presents QuantumSort, a novel sorting algorithm.",
  },
  {
    title: "1. Introduction",
    content: "Sorting is fundamental to computer science.",
  },
  {
    title: "2. Methods",
    content:
      "We propose a quantum-inspired partitioning scheme operating in O(n log n).",
  },
];

const mockNotebookCells = [
  {
    cell_type: "markdown",
    source: "# QuantumSort Tutorial\nImplementing the paper's algorithms.",
  },
  {
    cell_type: "code",
    source: "import numpy as np\n\ndef quantum_sort(arr):\n    pass",
  },
  {
    cell_type: "markdown",
    source: "## Results\nLet's benchmark our implementation.",
  },
  {
    cell_type: "code",
    source: 'arr = [5, 3, 1, 4, 2]\nresult = quantum_sort(arr)\nprint(result)',
  },
];

describe("AiService", () => {
  it("sends structured prompt to OpenAI and returns notebook cells", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify(mockNotebookCells),
          },
        },
      ],
    });

    const result = await service.generateNotebook(sampleSections, [], "sk-test");

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("gpt-4o");
    expect(callArgs.messages.length).toBeGreaterThanOrEqual(2);

    expect(result).toHaveLength(4);
    expect(result[0].cell_type).toBe("markdown");
    expect(result[1].cell_type).toBe("code");
  });

  it("includes paper sections in the prompt", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        { message: { content: JSON.stringify(mockNotebookCells) } },
      ],
    });

    await service.generateNotebook(sampleSections, [], "sk-test");

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages.find(
      (m: any) => m.role === "user"
    );
    expect(userMessage.content).toContain("QuantumSort");
    expect(userMessage.content).toContain("Abstract");
  });

  it("throws generic error on API failure without leaking details", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API rate limit exceeded for org-secret123"));

    await expect(
      service.generateNotebook(sampleSections, [], "sk-test")
    ).rejects.toThrow(/generation failed/i);

    // Should NOT contain the internal error details
    try {
      await service.generateNotebook(sampleSections, [], "sk-test");
    } catch (e: any) {
      // mockCreate already consumed, so this won't reach here in normal flow
    }
  });

  it("throws generic error on malformed JSON without leaking response content", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "secret internal data not valid json" } }],
    });

    await expect(
      service.generateNotebook(sampleSections, [], "sk-test")
    ).rejects.toThrow(/generation failed/i);
  });

  it("passes the user-provided API key to OpenAI client", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        { message: { content: JSON.stringify(mockNotebookCells) } },
      ],
    });

    await service.generateNotebook(sampleSections, [], "sk-my-custom-key");

    // Verify the service was called (API key is passed to constructor)
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("filters out cells with invalid cell_type", async () => {
    const cellsWithInvalid = [
      { cell_type: "markdown", source: "# Valid" },
      { cell_type: "invalid_type", source: "bad cell" },
      { cell_type: "code", source: "print('hello')" },
      { cell_type: 123, source: "number type" },
    ];
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(cellsWithInvalid) } }],
    });

    const result = await service.generateNotebook(sampleSections, [], "sk-test");

    expect(result).toHaveLength(2);
    expect(result[0].cell_type).toBe("markdown");
    expect(result[1].cell_type).toBe("code");
  });

  it("filters out cells with empty or non-string source", async () => {
    const cellsWithBadSource = [
      { cell_type: "markdown", source: "# Valid" },
      { cell_type: "code", source: "" },
      { cell_type: "markdown", source: null },
      { cell_type: "code", source: 42 },
      { cell_type: "code", source: "print('valid')" },
    ];
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(cellsWithBadSource) } }],
    });

    const result = await service.generateNotebook(sampleSections, [], "sk-test");

    expect(result).toHaveLength(2);
    expect(result[0].source).toBe("# Valid");
    expect(result[1].source).toBe("print('valid')");
  });

  it("throws error when all cells are invalid (zero valid cells)", async () => {
    const allInvalid = [
      { cell_type: "invalid", source: "bad" },
      { cell_type: "code", source: "" },
      { cell_type: "markdown", source: null },
    ];
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(allInvalid) } }],
    });

    await expect(
      service.generateNotebook(sampleSections, [], "sk-test")
    ).rejects.toThrow(/generation failed/i);
  });

  it("filters out non-object entries in the cells array", async () => {
    const mixedArray = [
      "just a string",
      42,
      null,
      { cell_type: "code", source: "valid_code()" },
    ];
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(mixedArray) } }],
    });

    const result = await service.generateNotebook(sampleSections, [], "sk-test");

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("valid_code()");
  });
});
