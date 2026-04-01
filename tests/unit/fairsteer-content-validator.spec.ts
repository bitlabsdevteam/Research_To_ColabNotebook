import { describe, it, expect } from "vitest";
import { validateFairSteerContent } from "../../apps/api/src/generate/fairsteer-content-validator";

// Minimal valid FairSteer notebook cell set — contains all 10 required tokens
function makeValidFairSteerNotebook() {
  return {
    nbformat: 4,
    cells: [
      {
        cell_type: "markdown",
        source: "# FairSteer for Dream 7B",
        metadata: {},
      },
      {
        cell_type: "code",
        source: [
          "from transformers import AutoModel, AutoTokenizer\n",
          "model = AutoModel.from_pretrained('Dream-org/Dream-v0-Instruct-7B', trust_remote_code=True)\n",
          "MASK_TOKEN_ID = tokenizer.mask_token_id\n",
        ],
        metadata: {},
        outputs: [],
      },
      {
        cell_type: "code",
        source:
          "out = model(input_ids, output_hidden_states=True)\nfrom sklearn.linear_model import LogisticRegression\nclf = LogisticRegression()",
        metadata: {},
        outputs: [],
      },
      {
        cell_type: "code",
        source:
          "hook_handle = model.model.layers[best_layer].mlp.register_forward_hook(fn)\noutput = model.diffusion_generate(input_ids)",
        metadata: {},
        outputs: [],
      },
      {
        cell_type: "code",
        source:
          "class DiffusionState:\n    current_x = None\ndsv = np.mean(acts_unbiased - acts_biased, axis=0)",
        metadata: {},
        outputs: [],
      },
      {
        cell_type: "code",
        source: "from sklearn.decomposition import PCA\npca = PCA(n_components=2)",
        metadata: {},
        outputs: [],
      },
    ],
  };
}

describe("validateFairSteerContent", () => {
  // ── Valid notebook ────────────────────────────────────────────────────────

  it("returns valid=true when all 10 required tokens are present", () => {
    const result = validateFairSteerContent(makeValidFairSteerNotebook());
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  // ── Individual missing tokens ─────────────────────────────────────────────

  it("detects missing AutoModel", () => {
    const nb = makeValidFairSteerNotebook();
    (nb.cells[1] as any).source = ["from transformers import AutoModelForCausalLM\n"];
    const result = validateFairSteerContent(nb);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("AutoModel");
  });

  it("detects missing trust_remote_code", () => {
    const nb = makeValidFairSteerNotebook();
    (nb.cells[1] as any).source = ["from transformers import AutoModel\n", "model = AutoModel.from_pretrained('Dream-org/Dream-v0-Instruct-7B')\n"];
    const result = validateFairSteerContent(nb);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("trust_remote_code");
  });

  it("detects missing mask_token_id", () => {
    const nb = makeValidFairSteerNotebook();
    (nb.cells[1] as any).source = ["from transformers import AutoModel\nmodel = AutoModel.from_pretrained('x', trust_remote_code=True)\n"];
    const result = validateFairSteerContent(nb);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("mask_token_id");
  });

  it("detects missing LogisticRegression", () => {
    const nb = makeValidFairSteerNotebook();
    (nb.cells[2] as any).source = "out = model(input_ids, output_hidden_states=True)";
    const result = validateFairSteerContent(nb);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("LogisticRegression");
  });

  it("detects missing output_hidden_states", () => {
    const nb = makeValidFairSteerNotebook();
    (nb.cells[2] as any).source = "from sklearn.linear_model import LogisticRegression\nclf = LogisticRegression()";
    const result = validateFairSteerContent(nb);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("output_hidden_states");
  });

  it("detects missing register_forward_hook", () => {
    const nb = makeValidFairSteerNotebook();
    (nb.cells[3] as any).source = "output = model.diffusion_generate(input_ids)";
    const result = validateFairSteerContent(nb);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("register_forward_hook");
  });

  it("detects missing diffusion_generate", () => {
    const nb = makeValidFairSteerNotebook();
    (nb.cells[3] as any).source = "hook_handle = model.model.layers[best_layer].mlp.register_forward_hook(fn)";
    const result = validateFairSteerContent(nb);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("diffusion_generate");
  });

  it("detects missing DiffusionState", () => {
    const nb = makeValidFairSteerNotebook();
    (nb.cells[4] as any).source = "dsv = np.mean(acts_unbiased - acts_biased, axis=0)";
    const result = validateFairSteerContent(nb);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("DiffusionState");
  });

  it("detects missing np.mean", () => {
    const nb = makeValidFairSteerNotebook();
    (nb.cells[4] as any).source = "class DiffusionState:\n    current_x = None";
    const result = validateFairSteerContent(nb);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("np.mean");
  });

  it("detects missing PCA", () => {
    const nb = makeValidFairSteerNotebook();
    (nb.cells[5] as any).source = "import matplotlib.pyplot as plt";
    const result = validateFairSteerContent(nb);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("PCA");
  });

  // ── Multiple missing tokens ───────────────────────────────────────────────

  it("reports multiple missing tokens at once", () => {
    const nb = {
      nbformat: 4,
      cells: [
        { cell_type: "markdown", source: "# intro", metadata: {} },
        { cell_type: "code", source: "print('hello')", metadata: {}, outputs: [] },
      ],
    };
    const result = validateFairSteerContent(nb);
    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThanOrEqual(8);
  });

  // ── Source as string array ────────────────────────────────────────────────

  it("handles source as array of strings (joins them)", () => {
    const nb = makeValidFairSteerNotebook();
    // Replace a cell source with an array — validator should join them
    (nb.cells[5] as any).source = ["from sklearn.decomposition import PCA\n", "pca = PCA(n_components=2)\n"];
    const result = validateFairSteerContent(nb);
    expect(result.valid).toBe(true);
  });

  // ── Case insensitivity ────────────────────────────────────────────────────

  it("is case-insensitive for token matching", () => {
    const nb = makeValidFairSteerNotebook();
    // automodel is lowercase in the cell source
    (nb.cells[1] as any).source = "from transformers import automodel\nautomodel.from_pretrained('x', trust_remote_code=true)\nmask_token_id = 151666";
    const result = validateFairSteerContent(nb);
    // AutoModel (case-insensitive) should match "automodel"
    expect(result.missing).not.toContain("AutoModel");
    expect(result.missing).not.toContain("trust_remote_code");
    expect(result.missing).not.toContain("mask_token_id");
  });
});
