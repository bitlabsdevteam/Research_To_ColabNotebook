# Sprint v6 — FairSteer Bias Detection Mode + Core Engine Hardening

## Sprint Overview

Sprint v6 has two tracks. The first hardens the core PDF-to-Colab engine: ensuring the `/generate` endpoint is robust, validates its output, and produces notebooks that actually run in Colab. The second adds a **FairSteer mode** — a new analysis dropdown on the form that, when selected, generates a specialized Colab notebook implementing all three FairSteer stages (BAD, DSV, DAS) against the language model described in the uploaded PDF, complete with bias score visualizations.

## Goals

- **G1**: The `/generate` endpoint is reliable — proper error handling, timeouts, output validation, and a prompt that consistently produces runnable `.ipynb` files
- **G2**: A mode selector dropdown ("None" / "FairSteer") appears in the form card
- **G3**: In FairSteer mode, the generated notebook implements all three FairSteer stages with executable Python cells: BAD (Biased Activation Detection), DSV (Debiasing Steering Vector computation), DAS (Dynamic Activation Steering)
- **G4**: The FairSteer notebook includes visualizations: PCA scatter plot of biased vs. unbiased activations, per-layer classifier accuracy curve, and a bias score summary bar chart
- **G5**: All existing tests continue to pass; new E2E and unit tests cover the FairSteer flow

## Background: FairSteer (ACL 2025)

FairSteer is an inference-time debiasing framework for LLMs (published at ACL 2025, Zhejiang University). It requires no model retraining and works by steering hidden-layer activations during inference.

### The Three Stages

**Stage 1 — Biased Activation Detection (BAD)**
Trains a lightweight logistic regression classifier on the last-token activations `a^l` at each intermediate layer `l`. The classifier learns to distinguish biased from unbiased model responses. The optimal layer (typically 13–15 for 7B-13B models) is selected by validation accuracy.

```
ŷ = σ(w^T · a^l + b)
Loss = CrossEntropy + λ‖w‖²
```

**Stage 2 — Debiasing Steering Vector (DSV)**
Computes a directional vector in activation space that points from the "biased cluster" toward the "unbiased cluster". Uses ~100 contrastive prompt pairs (P⁺ = biased behavior, P⁻ = unbiased behavior) from the BBQ dataset.

```
v^l = (1/|D_DSV|) · Σ [ a^l(P⁺) - a^l(P⁻) ]
```

**Stage 3 — Dynamic Activation Steering (DAS)**
At inference, checks whether the input triggers biased activation (ŷ < 0.5). If so, adds the DSV to the activation at the selected layer before propagation continues:

```
a^l_adj = a^l + v^l   (only if ŷ < 0.5)
```

### Key Reference
- Paper: *FairSteer: Inference Time Debiasing for LLMs with Dynamic Activation Steering* (ACL 2025)
- Code: https://github.com/LiYichen99/FairSteer
- Models tested: Llama-2 7B/13B, Llama-3 8B, Vicuna 7B/13B, Mistral 7B
- Datasets: BBQ, UNQOVER, CrowS-Pairs, CEB

## User Stories

1. **As a researcher**, I want to upload a paper about any language model and get a runnable Colab notebook — without it failing due to malformed JSON or missing cells.
2. **As a bias researcher**, I want to select "FairSteer" mode before generating, so the output notebook teaches me how to apply BAD, DSV, and DAS to the model in the paper.
3. **As a researcher new to FairSteer**, I want each stage explained in markdown cells before the code, so I can understand what each cell is doing and why.
4. **As a researcher**, I want the notebook to include visualizations (PCA scatter, accuracy curve, bias score chart) so I can immediately see whether the model has detectable biases.
5. **As a returning user**, I want all my previously saved notebooks to still work and the app to remain stable while new features are added.

## Technical Architecture

### Stack (additions/changes to v5)

| Layer | Change | Notes |
|-------|--------|-------|
| Frontend form | Add mode selector dropdown | `"none"` \| `"fairsteer"` |
| NestJS backend | Add `mode` field to `/generate` request | Routes to correct prompt template |
| NestJS backend | Add prompt template: `fairsteer.prompt.ts` | FairSteer-specific system + user prompt |
| NestJS backend | Add notebook validator utility | Validates `nbformat`, `cells`, cell types |
| NestJS backend | Harden error handling + timeout | Wrap OpenAI call in try/catch with 60s timeout |

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Next.js)                                          │
│                                                             │
│  FormCard                                                   │
│  ├── ApiKeyInput                                            │
│  ├── PdfUpload                                              │
│  ├── [NEW] ModeSelector  ← "None" | "FairSteer" dropdown   │
│  └── GenerateButton                                         │
│                                                             │
│  POST /generate  { pdf, mode: "none"|"fairsteer" }          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  NestJS (apps/api)                                          │
│                                                             │
│  GenerateController                                         │
│  └── GenerateService                                        │
│       ├── parseText(pdf)        ← extract PDF text          │
│       ├── selectPrompt(mode)    ← route to prompt template  │
│       │    ├── default.prompt.ts   (existing)               │
│       │    └── fairsteer.prompt.ts [NEW]                    │
│       ├── callOpenAI(prompt, text) ← with 60s timeout       │
│       ├── validateNotebook(json)   [NEW] ← structural check │
│       └── return notebook JSON                              │
└─────────────────────────────────────────────────────────────┘
```

### FairSteer Notebook Structure

When mode = `"fairsteer"`, the generated notebook contains these sections:

```
Section 0: Introduction
  [markdown] — Overview of FairSteer (BAD → DSV → DAS) and the paper
  [markdown] — Summary of the model from the uploaded PDF

Section 1: Installation & Setup
  [code] — pip install transformers torch datasets scikit-learn matplotlib seaborn

Section 2: Load Model & Tokenizer
  [markdown] — Explains the model identified in the paper
  [code] — Load model from HuggingFace, set to eval mode, hook intermediate layers

Section 3: Stage 1 — Biased Activation Detection (BAD)
  [markdown] — Explains BAD: what a biased activation is, what the classifier detects
  [code] — Build DBAD dataset from BBQ (sample biased/unbiased Q&A pairs)
  [code] — Extract last-token activations from each layer
  [code] — Train logistic regression classifier per layer (sklearn)
  [code] — Plot: per-layer classifier accuracy curve (matplotlib)
  [code] — Select optimal layer l* (highest accuracy)

Section 4: Stage 2 — DSV Computation
  [markdown] — Explains DSV: geometric direction from biased → unbiased subspace
  [code] — Build DDSV: 100 contrastive BBQ prompt pairs
  [code] — Extract activations for biased (P+) and unbiased (P−) prompts at l*
  [code] — Compute DSV: v^l* = mean(a^l*(P+) - a^l*(P−))
  [code] — Plot: 2D PCA scatter of biased vs. unbiased activations + DSV arrow

Section 5: Stage 3 — Dynamic Activation Steering (DAS)
  [markdown] — Explains DAS: conditional intervention only when bias detected
  [code] — Register forward hook at l* to check classifier + add DSV if ŷ < 0.5
  [code] — Run biased test prompt before/after DAS — compare outputs
  [code] — Run BBQ sample (20 questions) and compute bias score before/after

Section 6: Bias Score Summary
  [code] — Bar chart: bias score before vs. after FairSteer for each BBQ category
  [code] — Print summary table: Accuracy, BS(a), BS(d)
```

### Data Flow — FairSteer Mode

```
User selects "FairSteer" mode + uploads PDF about a language model
  → Frontend sends POST /generate { pdf, mode: "fairsteer" }
  → NestJS extracts text from PDF (identifies model name/architecture)
  → NestJS uses fairsteer.prompt.ts system prompt:
      "You are an expert in LLM bias detection using FairSteer (ACL 2025).
       Given this paper, generate a complete Colab notebook that implements
       BAD, DSV, and DAS for [identified model]. Include visualizations."
  → OpenAI returns notebook JSON (nbformat 4)
  → validateNotebook() checks structure
  → Return notebook JSON to frontend
  → Frontend shows ResultPanel with save + share (same as v5)
```

### Core Engine Hardening (Item 1)

Current issues to fix in `/generate`:
1. **No timeout** — OpenAI call can hang indefinitely; add 60s timeout
2. **No output validation** — if OpenAI returns malformed JSON or plain text, the frontend crashes; add `validateNotebook()` that checks `nbformat`, `cells` array, cell types
3. **Prompt too generic** — current prompt doesn't enforce runnable code; update to explicitly require executable cells, correct import statements, and a working install cell
4. **No retry on malformed response** — add one retry if validation fails

## Out of Scope (v6)

- Running FairSteer in the browser (computationally infeasible — this is a Colab notebook, not in-browser execution)
- Supporting models other than HuggingFace-hosted ones (e.g. GPT-4, Claude API)
- Image diffusion models (Stable Diffusion, DALL-E) — FairSteer operates on text LLM activations
- Custom BBQ dataset upload — uses the standard BBQ dataset from HuggingFace
- Mobile responsive layout (v7)
- arXiv URL input (v7)
- Markdown rendering in notebook preview (v7)

## Dependencies

- Sprint v5 complete (all tests passing)
- OpenAI API key required (user-provided, same as before)
- No new external services required — FairSteer notebook is generated by OpenAI then run by the user in Colab
- NestJS backend must already parse PDF text (verify this works end-to-end in Task 1)
