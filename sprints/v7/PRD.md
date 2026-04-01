# Sprint v7 — FairSteer for Dream 7B: Precise Bias Detection in a Diffusion Language Model

## Sprint Overview

Sprint v7 re-engineers the FairSteer pipeline specifically for **Dream-org/Dream-v0-Instruct-7B**, a masked diffusion language model (MDLM) whose architecture diverges fundamentally from the autoregressive LLMs (Llama, Mistral) for which FairSteer was originally designed. Every stage — model loading, activation extraction, forward-hook registration, and generation — requires Dream-specific adaptations. The sprint also adds a content-level notebook validator (ensuring the generated notebook actually contains FairSteer code, not just structural JSON), SSE streaming so the frontend shows live progress, and NestJS CLI vulnerability resolution.

---

## Goals

- **G1**: The FairSteer prompt template generates a Colab notebook that correctly implements all three FairSteer stages for Dream 7B — using `AutoModel` + `trust_remote_code=True`, mean-pool activation extraction over non-mask prompt tokens, and a `DiffusionState`-tracked forward hook that fires at every denoising step during `diffusion_generate()`
- **G2**: A `FairSteerContentValidator` checks the returned notebook contains all required code tokens (`AutoModel`, `trust_remote_code`, `LogisticRegression`, `register_forward_hook`, `diffusion_generate`, `mask_token_id`, `DiffusionState`, `np.mean`, `PCA`) and triggers a retry if any are absent
- **G3**: `ModelExtractorService` detects "Dream" in the PDF text and returns `{ name: "Dream-7B", huggingfaceId: "Dream-org/Dream-v0-Instruct-7B", isDiffusion: true }`, injected into the prompt so the Load Model cell uses the exact HuggingFace repo ID
- **G4**: `/generate/stream` emits SSE events (`parsing` → `generating` → `validating` → `complete`/`error`) consumed by a new `GenerationProgress` component in the frontend
- **G5**: `npm audit --omit=dev` exits 0

---

## Background: Why Dream 7B Requires a Different FairSteer Pipeline

### What is Dream 7B?

`Dream-org/Dream-v0-Instruct-7B` (HKUST, 2025) is a 7B-parameter **masked diffusion language model** initialized from Qwen2.5-7B weights. Unlike autoregressive models that generate one token left-to-right, Dream:

1. Initialises the response as all `[MASK]` tokens (token ID **151666**)
2. Passes the full sequence (prompt + masked response) through the transformer in one shot
3. Simultaneously predicts probabilities for all masked positions
4. Progressively unmasks a fraction of positions per denoising step (200–512 steps total)
5. Uses a **shift operation** (`logits[:, :-1]`) to maintain causal prediction semantics while using **bidirectional attention** (`is_causal=False`)

### Key Technical Facts (from config.json and modeling_dream.py)

| Property | Value |
|---|---|
| HuggingFace repo | `Dream-org/Dream-v0-Instruct-7B` |
| Model class | `DreamModel` (custom) → load via **`AutoModel`**, not `AutoModelForCausalLM` |
| `trust_remote_code` | **Required** (uses `modeling_dream.py`) |
| `hidden_size` | 3584 |
| `num_hidden_layers` | **28** |
| `num_attention_heads` | 28 (GQA: 4 KV heads) |
| `vocab_size` | 152,064 |
| `mask_token_id` | **151666** |
| Output type | `MaskedLMOutput` (not `CausalLMOutput`) |
| Attention | Bidirectional (`is_causal=False`) |
| Generation method | **`model.diffusion_generate()`** (not `model.generate()`) |
| MLP module path | `model.model.layers.{i}.mlp` (DreamBaseModel is at `model.model`) |
| `torch_dtype` | `bfloat16` |
| Optimal bias layer | Empirically ~10–14 (≈40–50% depth for 28-layer model) |

### The Three Differences That Break Standard FairSteer

| FairSteer Stage | Autoregressive Assumption | Why It Fails for Dream 7B | Required Fix |
|---|---|---|---|
| **Model loading** | `AutoModelForCausalLM` | Dream uses `DreamModel` class | `AutoModel` + `trust_remote_code=True` |
| **BAD — activation extraction** | Last-token hidden state (`hs[:, -1, :]`) | `is_causal=False` → last token is not a sufficient summary; `[MASK]` tokens at response positions pollute last-token extraction | Mean-pool over non-mask **prompt** tokens |
| **DAS — hook registration + generation** | Single `model.generate()` call, hook fires once | `diffusion_generate()` runs 200–512 forward passes; hook must fire at every step; mask boundary shifts each step | `register_forward_hook` on `model.model.layers[l*].mlp` + `DiffusionState` tracked via `generation_tokens_hook_func` |

---

## FairSteer Algorithm — Precise Specification for Dream 7B

### Stage 1: BAD (Biased Activation Detection)

**Purpose**: Train one logistic regression probe per transformer layer to distinguish biased from unbiased activations.

**Data**: BBQ dataset (`heegyu/bbq`) — ambiguous-context split. For each QA example:
- Label `y=0` (biased): stereotypical answer selected
- Label `y=1` (unbiased): neutral/correct answer selected

**Activation extraction for Dream 7B:**
```python
import torch, numpy as np
from transformers import AutoModel, AutoTokenizer

model = AutoModel.from_pretrained(
    "Dream-org/Dream-v0-Instruct-7B",
    torch_dtype=torch.bfloat16,
    trust_remote_code=True
).eval().cuda()

tokenizer = AutoTokenizer.from_pretrained(
    "Dream-org/Dream-v0-Instruct-7B",
    trust_remote_code=True
)
MASK_TOKEN_ID = 151666

def extract_activations(model, tokenizer, prompt_text):
    inputs = tokenizer(prompt_text, return_tensors="pt").to(model.device)
    input_ids = inputs["input_ids"]

    with torch.no_grad():
        out = model(input_ids, output_hidden_states=True)
    # out.hidden_states: tuple of 29 tensors, each (1, seq_len, 3584)

    activations = []
    for hs in out.hidden_states:  # 29 layers (embed + 28 transformer)
        # Mean-pool over non-MASK prompt positions (bidirectional model)
        non_mask = (input_ids[0] != MASK_TOKEN_ID)  # (seq_len,)
        pooled = hs[0][non_mask].mean(dim=0)        # (3584,)
        activations.append(pooled.cpu().float().numpy())

    return np.stack(activations)  # (29, 3584)
```

**Probe training (per layer):**
```python
from sklearn.linear_model import LogisticRegression

val_accuracies = []
probes = []
for layer_idx in range(29):
    X_train = all_activations[:, layer_idx, :]   # (N, 3584)
    clf = LogisticRegression(max_iter=1000, C=1.0, penalty="l2")
    clf.fit(X_train, y_train)
    val_acc = clf.score(X_val, y_val)
    val_accuracies.append(val_acc)
    probes.append(clf)

best_layer = int(np.argmax(val_accuracies))  # typically 10–14 for Dream 7B
```

### Stage 2: DSV (Debiasing Steering Vector)

**Purpose**: Compute one steering vector per layer from 110 contrastive BBQ prompt pairs.

**Construction**: No changes from standard FairSteer — the `mean_difference` algorithm is model-agnostic. Run the same activation extraction from Stage 1 on both `P⁺` (biased) and `P⁻` (unbiased) prompts; compute:

```python
# For each layer:
dsv = np.mean(activations_unbiased - activations_biased, axis=0)
# Points from biased subspace → unbiased subspace
# Shape: (3584,) per layer
```

**PCA visualization of separation:**
```python
from sklearn.decomposition import PCA
pca = PCA(n_components=2)
all_acts = np.vstack([activations_biased, activations_unbiased])
projected = pca.fit_transform(all_acts)
n = len(activations_biased)
plt.scatter(projected[:n,0], projected[:n,1], c='red', label='Biased', alpha=0.6)
plt.scatter(projected[n:,0], projected[n:,1], c='green', label='Unbiased', alpha=0.6)
dsv_2d = pca.transform(dsv.reshape(1,-1))[0]
plt.annotate("", xy=dsv_2d, xytext=(0,0),
             arrowprops=dict(arrowstyle="->", color="blue", lw=2))
plt.title("PCA: biased vs unbiased activations (DSV arrow)")
```

### Stage 3: DAS (Dynamic Activation Steering) — Dream 7B Specific

**The core problem**: `diffusion_generate()` calls `model.forward()` 200–512 times per generation. A standard `with TraceDict(...)` context block or a hook applied only around a single `model.generate()` call is insufficient — the hook must remain active across all denoising steps, and it must dynamically detect the current mask boundary at each step.

**Solution — `DiffusionState` + `generation_tokens_hook_func` + persistent hook:**

```python
import torch, numpy as np

MASK_TOKEN_ID = 151666
ALPHA = 20  # intervention strength

class DiffusionState:
    """Tracks the current partial sequence during diffusion generation."""
    current_x = None

state = DiffusionState()

def tokens_hook_func(step, x, logits):
    """Called by diffusion_generate at every denoising step."""
    state.current_x = x  # x: (batch, seq_len) — partially unmasked
    return x  # return unchanged (we only use this for state tracking)

def make_das_hook(probe, steering_vector, alpha, state, mask_token_id):
    sv = torch.from_numpy(steering_vector).float()

    def hook_fn(module, inp, output):
        if state.current_x is None:
            return output

        hidden = output[0].clone().float()  # (batch, seq_len, 3584)

        for b in range(hidden.shape[0]):
            x_b = state.current_x[b]
            # Find last non-MASK prompt position (boundary shifts each step)
            non_mask_pos = (x_b != mask_token_id).nonzero(as_tuple=True)[0]
            if len(non_mask_pos) == 0:
                continue
            last_pos = non_mask_pos[-1].item()

            act = hidden[b, last_pos, :].cpu().numpy()
            y_hat = probe.predict([act])  # 0=biased, 1=unbiased

            if y_hat[0] == 0:  # bias detected → apply DSV
                sv_dev = sv.to(hidden.device)
                hidden[b, last_pos, :] += alpha * sv_dev

        return (hidden.to(output[0].dtype),) + output[1:]

    return hook_fn

# Hook path: model.model is DreamBaseModel; layers are at model.model.layers
hook_handle = model.model.layers[best_layer].mlp.register_forward_hook(
    make_das_hook(probes[best_layer], dsv[best_layer], ALPHA, state, MASK_TOKEN_ID)
)

# Generate with Dream's diffusion API
messages = [{"role": "user", "content": question}]
inputs = tokenizer.apply_chat_template(
    messages, return_tensors="pt", return_dict=True, add_generation_prompt=True
).to(model.device)

output = model.diffusion_generate(
    inputs["input_ids"],
    attention_mask=inputs["attention_mask"],
    max_new_tokens=200,
    steps=200,
    temperature=0.0,
    alg="entropy",
    generation_tokens_hook_func=tokens_hook_func,  # tracks state each step
    return_dict_in_generate=True,
)

hook_handle.remove()  # always remove after generation

answer = tokenizer.decode(
    output.sequences[0][inputs["input_ids"].shape[1]:],
    skip_special_tokens=True
)
```

---

## Notebook Structure (6 Sections — Dream 7B Specific)

```
Section 1 — Introduction
  [markdown] FairSteer overview (BAD→DSV→DAS) for Dream 7B
  [markdown] Why diffusion LMs need a modified pipeline (bidirectional attn, multi-step gen)

Section 2 — Setup
  [code] pip install transformers datasets scikit-learn matplotlib numpy torch
  [code] imports: AutoModel, AutoTokenizer, LogisticRegression, PCA, datasets, torch, np, plt

Section 3 — Load Model
  [markdown] Dream 7B loading — AutoModel + trust_remote_code required
  [code] model = AutoModel.from_pretrained("Dream-org/Dream-v0-Instruct-7B",
            torch_dtype=torch.bfloat16, trust_remote_code=True)
  [code] tokenizer = AutoTokenizer.from_pretrained(..., trust_remote_code=True)
  [code] MASK_TOKEN_ID = tokenizer.mask_token_id  # 151666

Section 4 — BAD (Biased Activation Detection)
  [markdown] BAD explanation: per-layer probe on mean-pooled non-mask activations
  [code] load BBQ dataset: load_dataset("heegyu/bbq", "Age", split="test")
  [code] extract_activations(): output_hidden_states=True, mean-pool over non-mask positions
  [code] LogisticRegression probe per layer; collect val_accuracies
  [code] plot per-layer accuracy; identify best_layer (argmax)

Section 5 — DSV + DAS
  [markdown] DSV: mean-difference direction per layer from contrastive BBQ pairs
  [code] build contrastive pairs (P+ biased, P- unbiased)
  [code] dsv = np.mean(activations_unbiased - activations_biased, axis=0)
  [code] PCA scatter: biased (red) vs unbiased (green) + DSV arrow
  [markdown] DAS: DiffusionState + generation_tokens_hook_func + register_forward_hook
  [code] DiffusionState class + tokens_hook_func
  [code] make_das_hook(): checks bias at last non-mask position, applies DSV if y_hat==0
  [code] hook on model.model.layers[best_layer].mlp
  [code] model.diffusion_generate() before/after comparison

Section 6 — Visualization
  [code] per-layer accuracy curve (matplotlib, best_layer marked)
  [code] PCA scatter plot (already generated in Section 5)
  [code] bar chart: bias score before vs after FairSteer on BBQ sample
  [code] summary table: accuracy, BS(a), BS(d)
```

---

## Technical Architecture

### Stack Changes from v6

| Layer | Change |
|---|---|
| NestJS — fairsteer.prompt.ts | Rewritten for Dream 7B: `AutoModel`, `DiffusionState`, `generation_tokens_hook_func`, `model.model.layers[l].mlp`, mean-pool activations, `diffusion_generate` |
| NestJS — new service | `ModelExtractorService` — detects Dream/diffusion in PDF text |
| NestJS — new validator | `FairSteerContentValidator` — content-level check for 9 required code tokens |
| NestJS — new endpoint | `GET /generate/stream` — `@Sse()` emitting stage events |
| Frontend — new component | `GenerationProgress` — 4-stage progress list consuming SSE |
| Frontend — page.tsx | `handleGenerateStream()` replacing blocking `fetch()` |
| NestJS deps | Upgrade `@nestjs/cli` — clears path-to-regexp / picomatch vulns |

### SSE Event Protocol

```
{ event: "parsing",    data: { message: "Extracting PDF text..." } }
{ event: "generating", data: { message: "Calling AI (attempt 1/2)...", model: "Dream-7B" } }
{ event: "validating", data: { message: "Validating notebook structure and content..." } }
{ event: "complete",   data: <notebook JSON> }

// On failure:
{ event: "error",      data: { error: "FairSteer notebook missing: register_forward_hook, DiffusionState" } }
```

---

## Out of Scope (v7)

- Running the notebook server-side (computationally infeasible)
- arXiv URL input (v8)
- Mobile responsive layout (v8)
- Markdown rendering in notebook preview (v8)
- Multi-model comparison
- Non-HuggingFace models (GPT-4, Claude API) in FairSteer mode
- GPU probe inference optimisation (future — probe runs on CPU per the original FairSteer impl)

---

## Dependencies

- Sprint v6 complete (227 vitest + 137 Playwright passing)
- OpenAI API key (user-provided)
- No new external services
- Node 20, NestJS 10, Next.js 14 (unchanged)
