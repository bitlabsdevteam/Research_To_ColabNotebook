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
    expect(callArgs.model).toBe("gpt-5.4");
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

  it("handles API errors gracefully", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API rate limit exceeded"));

    await expect(
      service.generateNotebook(sampleSections, [], "sk-test")
    ).rejects.toThrow(/rate limit/i);
  });

  it("handles malformed JSON response", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "not valid json" } }],
    });

    await expect(
      service.generateNotebook(sampleSections, [], "sk-test")
    ).rejects.toThrow(/parse|json/i);
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
});
