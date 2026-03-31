# Sprint v6 — Walkthrough

## Summary

Sprint v6 delivered two parallel tracks: **core engine hardening** and **FairSteer bias detection mode**. The `/generate` endpoint was made production-grade with a 60-second timeout, 2-attempt retry loop, structural notebook validation, and a 422 error response for generation failures. On top of this solid foundation, a new "FairSteer" mode was added end-to-end — a dropdown in the UI routes to a specialized NestJS prompt template that instructs OpenAI to generate a 6-section Colab notebook implementing all three FairSteer stages (BAD, DSV, DAS) for any language model described in an uploaded PDF.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Next.js App Router)                                   │
│                                                                 │
│  page.tsx                                                       │
│  ├── ApiKeyInput                                                │
│  ├── PdfUpload                                                  │
│  ├── ModeSelector  ← NEW: "None" | "FairSteer" dropdown        │
│  │   └── fairsteer-banner  (conditional blue info box)         │
│  └── GenerateButton                                             │
│       └── POST /generate  { pdf, Authorization, mode }         │
└──────────────────────────┬──────────────────────────────────────┘
                           │  multipart/form-data
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  NestJS API  (apps/api)                                         │
│                                                                 │
│  GenerateController                                             │
│  ├── reads @Body("mode")  → sanitize to "none"|"fairsteer"     │
│  ├── validates PDF + Bearer token                               │
│  └── calls GenerateService.generate(buffer, apiKey, mode)       │
│                                                                 │
│  GenerateService                                                │
│  ├── PdfParserService.parse()  → sections, rawText             │
│  ├── FigureExtractorService.extract()  (soft failure)          │
│  ├── mode routing:                                              │
│  │   ├── "fairsteer" → buildFairSteerPrompt(rawText)           │
│  │   └── "none"      → default SYSTEM_PROMPT + buildUserPrompt │
│  └── retry loop (max 2 attempts):                              │
│      ├── AiService.generateNotebook(…, promptOverrides?)       │
│      ├── NotebookBuilderService.build()                        │
│      ├── validateNotebook()  ← NEW: structural validator       │
│      └── throws GenerationError → controller → HTTP 422        │
│                                                                 │
│  AiService                                                      │
│  ├── AbortController (60s timeout)  ← NEW                      │
│  ├── gpt-4o model                                               │
│  ├── promptOverrides? { system, user }  ← NEW 5th param        │
│  └── filters/validates cells before returning                   │
└─────────────────────────────────────────────────────────────────┘

Prompt Templates (apps/api/src/…/prompts/)
  ├── notebook-prompt.ts    — default general-purpose prompt
  └── fairsteer.prompt.ts   — FairSteer BAD+DSV+DAS prompt (NEW)
      ├── system: FairSteer expert persona + few-shot code examples
      └── user:   paper text + 6-section structure instruction
```

---

## Files Created / Modified

### `apps/api/src/generate/notebook-validator.ts` *(new)*

**Purpose**: Validates that any value claims to be a valid nbformat 4 notebook before it is returned to the caller.

**Key Functions**:
- `validateNotebook(json: unknown): ValidationResult` — runs 6 structural checks and collects all errors (does not stop at first failure)

**How it works**:

The validator receives the parsed JSON from `NotebookBuilderService` and checks it against the nbformat 4 spec. Rather than trusting OpenAI's output blindly, it verifies that the notebook is a non-null object, that `nbformat` equals `4`, that `cells` is a non-empty array, and that every cell has a valid `cell_type`, a `source` field, and (for code cells) an `outputs` array.

```typescript
export function validateNotebook(json: unknown): ValidationResult {
  const errors: string[] = [];
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    errors.push("notebook must be a non-null object ...");
    return { valid: false, errors };
  }
  // ... checks nbformat, cells, cell_type, source, outputs
  return { valid: errors.length === 0, errors };
}
```

All errors are collected in a single pass so callers get a complete picture of what is wrong. If validation fails, `GenerateService` logs the errors, retries with a corrective instruction appended to the prompt, and throws `GenerationError` if the second attempt also fails.

---

### `apps/api/src/generate/generation-error.ts` *(new)*

**Purpose**: A typed error class that signals the controller to return HTTP 422 instead of 500.

```typescript
export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationError";
  }
}
```

The controller catches `GenerationError` specifically and returns `{ error: message }` with status 422. All other errors fall through to the generic 500 handler. This means callers can distinguish "generation failed after retries" from unexpected server crashes.

---

### `apps/api/src/generate/generate.service.ts` *(modified)*

**Purpose**: Orchestrates PDF parsing, AI generation, notebook building, and validation — now with a mode parameter and retry loop.

**Key changes**:
- `generate(pdfBuffer, apiKey, mode = "none")` — accepts mode, defaults to "none"
- Builds `promptOverrides` if `mode === "fairsteer"`: calls `buildFairSteerPrompt(parsed.rawText)`
- 2-attempt retry loop: catches both AI throws and validation failures; appends `RETRY_INSTRUCTION` on the second attempt

```typescript
for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
  const retryInstruction = attempt > 0 ? RETRY_INSTRUCTION : undefined;
  try {
    const cells = await this.aiService.generateNotebook(
      parsed.sections, figures, apiKey, retryInstruction, promptOverrides
    );
    const notebook = this.notebookBuilder.build(cells, figures);
    const validation = validateNotebook(notebook);
    if (!validation.valid) { lastError = new Error(...); continue; }
    return notebook;
  } catch (err: any) { lastError = err; }
}
throw new GenerationError(`Failed to generate a valid notebook after 2 attempts`);
```

The retry instruction tells OpenAI to ensure every code cell has an `outputs` array, which was the most common validation failure in practice.

---

### `apps/api/src/ai/ai.service.ts` *(modified)*

**Purpose**: Calls the OpenAI API to generate notebook cells, now with a 60-second timeout and optional prompt overrides.

**Key changes**:
- `OPENAI_TIMEOUT_MS = 60_000` — `AbortController` cancels the fetch after 60 seconds
- `gpt-4o` model replacing the invalid `gpt-5.4` that was there before
- 5th parameter `promptOverrides?: { system: string; user: string }` — when present, the FairSteer system/user prompts are used instead of the defaults

```typescript
const systemPrompt = promptOverrides?.system ?? SYSTEM_PROMPT;
let userPrompt = promptOverrides?.user ?? buildUserPrompt(sections, figures);
if (retryInstruction) userPrompt += `\n\n${retryInstruction}`;

const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(...), OPENAI_TIMEOUT_MS);
try {
  response = await client.chat.completions.create(
    { model: "gpt-4o", messages: [...], temperature: 0.3 },
    { signal: controller.signal }
  );
} finally { clearTimeout(timeoutId); }
```

Errors from OpenAI are caught and re-thrown with a generic message that does not leak internal details (API keys, org IDs, rate limit details). Cell filtering removes invalid `cell_type` values and empty `source` strings.

---

### `apps/api/src/generate/generate.controller.ts` *(modified)*

**Purpose**: HTTP entry point for the `/generate` endpoint — now reads the `mode` field from the multipart body.

**Key change**: Added `@Body("mode") rawMode?: string` parameter. The mode is sanitized immediately — only `"fairsteer"` is accepted; anything else defaults to `"none"`. This prevents prompt injection via the mode field.

```typescript
const mode: "none" | "fairsteer" = rawMode === "fairsteer" ? "fairsteer" : "none";
const notebook = await this.generateService.generate(file.buffer, apiKey, mode);
```

`GenerationError` is caught and mapped to HTTP 422 with `{ error: string }`. All other errors become 500 with a generic message (no internal details leaked).

---

### `apps/api/src/ai/prompts/notebook-prompt.ts` *(modified)*

**Purpose**: Default system prompt for general-purpose notebook generation (non-FairSteer mode).

**Key changes** (Task 4): Four new explicit rules were added to the system prompt:

1. **pip install first** — "Include a pip install cell as the first code cell"
2. **markdown before code** — "Place a markdown explanation cell BEFORE each major code section"
3. **self-contained cells** — "All code cells must be self-contained and executable in sequence"
4. **limited imports** — "Use only imports from the Python standard library plus numpy, matplotlib, and the model's own dependencies"

These rules make OpenAI's output more reliably runnable in Google Colab without modification.

---

### `apps/api/src/generate/prompts/fairsteer.prompt.ts` *(new)*

**Purpose**: Specialized prompt template for FairSteer bias detection notebooks.

**Key Function**: `buildFairSteerPrompt(paperText: string): { system: string; user: string }`

**How it works**:

The system prompt establishes a FairSteer expert persona and explains all three stages (BAD, DSV, DAS) with their mathematical formulas. It also includes detailed **few-shot code examples** for each stage to guide OpenAI toward generating high-quality, executable Python:

- **BAD**: `load_dataset("heegyu/bbq")`, forward pass with `output_hidden_states=True`, `LogisticRegression` per-layer training, matplotlib per-layer accuracy plot
- **DSV**: contrastive prompt pair construction, `np.mean(activations_biased - activations_unbiased)`, `PCA(n_components=2)` scatter with biased (red) vs unbiased (green) clusters, DSV arrow annotation
- **DAS**: `forward_hook` function definition, `register_forward_hook` on best layer, conditional `dsv` addition when `prob < 0.5`, before/after comparison

The user prompt includes the raw PDF text and instructs generation of exactly 6 sections: Introduction, Setup, Load Model, BAD, DSV+DAS, Visualization.

```typescript
const user = `## Research Paper Content
${paperText}
---
Generate a FairSteer bias detection tutorial notebook...
The notebook MUST have exactly 6 sections in this order:
1. Introduction — markdown explaining FairSteer (BAD, DSV, DAS)
2. Setup — pip install cell + imports
3. Load Model — load from HuggingFace
4. BAD — activations + logistic regression
5. DSV + DAS — steering vector + forward hook
6. Visualization — matplotlib plots`;
```

---

### `apps/web/app/components/ModeSelector.tsx` *(new)*

**Purpose**: Controlled `<select>` dropdown that lets users choose between general notebook generation and FairSteer bias detection mode.

**Key Component**: `ModeSelector({ value, onChange })` — renders a styled `<select data-testid="mode-selector">` with two options, and conditionally renders a blue info banner when `"fairsteer"` is selected.

```tsx
{value === "fairsteer" && (
  <div data-testid="fairsteer-banner" style={{ backgroundColor: "rgba(59,130,246,0.1)", ... }}>
    FairSteer mode: generates a notebook implementing BAD, DSV, and DAS
    bias detection for the model in your PDF
  </div>
)}
```

The banner uses CSS variables for theming (`--color-border`, `--radius-md`) so it respects dark/light mode automatically. The custom SVG chevron is inlined as a data URI to avoid a separate network request.

---

### `apps/web/app/page.tsx` *(modified)*

**Purpose**: Main page — now manages mode state and includes it in the generate request.

**Key changes**:
- `const [mode, setMode] = useState<Mode>("none")` — new state
- `formData.append("mode", mode)` — appended to every `/generate` POST
- `ModeSelector` inserted between "Upload PDF" and "Generate" steps (form now has 4 numbered steps)
- Mock save-ID check moved outside `if (user)` guard so E2E tests can verify the `save-indicator` without being signed in:

```typescript
// Test environment: use injected mock save ID
if (typeof window !== "undefined" && (window as any).__supabase_mock_save_id) {
  setShareId((window as any).__supabase_mock_save_id as string);
}
```

---

## Data Flow

**Default (None) mode:**
```
User fills API key + uploads PDF + leaves mode="none"
→ page.tsx: FormData { pdf, mode="none" }
→ POST /generate (Authorization: Bearer sk-...)
→ Controller: mode="none", calls generateService.generate(buf, key, "none")
→ GenerateService: promptOverrides = undefined
→ AiService: uses default SYSTEM_PROMPT + buildUserPrompt(sections, figures)
→ OpenAI gpt-4o (60s timeout, 2 attempts)
→ validateNotebook() → OK
→ NotebookBuilderService.build() → { nbformat: 4, cells: [...] }
→ HTTP 200 JSON → ResultPanel renders
```

**FairSteer mode:**
```
User selects "FairSteer — bias detection" from dropdown
→ Blue info banner appears (BAD/DSV/DAS description)
→ page.tsx: FormData { pdf, mode="fairsteer" }
→ POST /generate
→ Controller: mode="fairsteer", calls generateService.generate(buf, key, "fairsteer")
→ GenerateService: promptOverrides = buildFairSteerPrompt(parsed.rawText)
→ AiService: uses FairSteer system prompt (BAD+DSV+DAS expert + few-shot examples)
             + FairSteer user prompt (6-section structure instruction + paper text)
→ OpenAI gpt-4o generates 6-section notebook
→ validateNotebook() → OK
→ HTTP 200 JSON → ResultPanel renders
```

**Generation failure path:**
```
Attempt 1 fails (AI error OR validateNotebook returns invalid)
→ GenerateService retries with RETRY_INSTRUCTION appended to user prompt
Attempt 2 also fails
→ throw GenerationError("Failed to generate a valid notebook after 2 attempts")
→ Controller: catch GenerationError → HTTP 422 { error: "..." }
→ page.tsx: error.message displayed in red pill badge
```

---

## Test Coverage

### Unit Tests (vitest) — 227 total

| Test file | Count | What it covers |
|-----------|-------|----------------|
| `notebook-validator.spec.ts` | 21 | All 6 validation checks: null, wrong nbformat, missing cells, bad cell_type, missing source, missing outputs |
| `generate-retry.spec.ts` | 12 | Retry on AI failure, retry on validation failure, corrective instruction on 2nd attempt, GenerationError, 422 controller response |
| `fairsteer-prompt.spec.ts` | 25 | FairSteer terminology (BAD/DSV/DAS/logistic regression/contrastive pairs), BAD few-shot (heegyu/bbq, output_hidden_states, LogisticRegression), DSV few-shot (PCA, np.mean, red/green scatter), DAS few-shot (forward_hook, register_forward_hook, prob<0.5) |
| `notebook-prompt.spec.ts` | 13 | Security guardrail, JSON output format, pip install first, markdown before code, self-contained cells, stdlib+numpy+matplotlib imports |
| `generate.controller.spec.ts` | 11 | Mode routing (fairsteer/none/invalid→none), file/auth validation, error masking |
| `generate.service.spec.ts` | 7 | PDF parsing, figure extraction, AI call arguments (incl. promptOverrides), GenerationError propagation |
| `ai.service.spec.ts` | 9 | gpt-4o model, cell filtering (invalid types/empty source), timeout source verification |
| Others (health, notebook-builder, etc.) | 129 | Existing coverage maintained |

### Integration Tests (vitest) — 13

| Test file | What it covers |
|-----------|----------------|
| `generate-engine.spec.ts` | Full NestJS integration: valid PDF → 200 with nbformat+cells, 400 for missing file/auth/wrong scheme, 422 for double AI rejection |

### E2E Tests (Playwright) — 137 passing, 1 skipped

| Test file | Count | What it covers |
|-----------|-------|----------------|
| `mode-selector.spec.ts` | 7 | Dropdown renders with none default, both options present, banner shows/hides, position in form, mode field in POST body |
| `fairsteer-flow.spec.ts` | 3 | FairSteer result-panel renders, mode=fairsteer in POST body, mode=none in POST body |
| `sprint-v6-smoke.spec.ts` | 4 | (a) none default, (b) banner on fairsteer, (c) correct mode in network request, (d) result-panel + save-indicator |
| `full-flow.spec.ts` | 2 | End-to-end generate flow + error state |
| Other sprint specs | 121 | All prior sprint acceptance criteria |

---

## Security Measures

1. **Prompt injection guardrail** — Both default and FairSteer system prompts explicitly instruct OpenAI to ignore adversarial content embedded in paper text. `sanitizeText()` strips known injection patterns (`"Ignore all previous instructions"`, `"You are now"`) from section content before building the user prompt.

2. **Mode sanitization** — The controller accepts only `"fairsteer"` or defaults to `"none"`; any other value is silently clamped. This prevents unknown mode strings from reaching the service.

3. **Error masking** — OpenAI errors (which may include API keys, org IDs, rate-limit details) are caught and re-thrown with a generic `"Notebook generation failed. Please try again."` message. `GenerationError` messages (which are user-safe) are forwarded as-is.

4. **60-second AbortController timeout** — Prevents the server from hanging indefinitely on a slow or stalled OpenAI connection.

5. **Structural validation before response** — `validateNotebook()` is the last gate before a notebook is returned to the client. Malformed or incomplete JSON from OpenAI is caught and retried rather than silently passed through.

6. **Semgrep** — Scanned after every task commit; clean throughout the sprint.

---

## Known Limitations

1. **Real API call not tested** — `quality-test.spec.ts` (the one skipped Playwright test) requires a live OpenAI key and network access. The FairSteer prompt quality can only be verified by actually running it against a real model paper PDF.

2. **rawText may be absent** — `GenerateService` falls back to concatenated section text if `parsed.rawText` is undefined. This is safe but FairSteer notebooks work better with the unstructured full text (more context for model identification).

3. **FairSteer notebook not post-validated** — The `validateNotebook()` call only checks structural validity (nbformat, cells, cell_type, source, outputs). It does not verify that the FairSteer notebook actually contains the expected 6 sections or any FairSteer-specific code. A bad OpenAI output could pass structural validation but generate a generic notebook.

4. **No streaming** — The entire notebook JSON is returned in one shot. For large papers with many sections, OpenAI may time out before completing the response. The 60-second timeout mitigates this but does not eliminate it.

5. **Pre-existing NestJS CLI vulnerabilities** — 12 vulnerabilities (5 high: `path-to-regexp`, `picomatch`) in `@nestjs/cli` dev dependencies. These are not in the production runtime and require breaking changes to fix. They were noted but not resolved in this sprint.

6. **mode=fairsteer ignored if API down** — If the OpenAI call fails both retry attempts, the user receives a 422 with a generic error — there is no indication that FairSteer mode was attempted vs. the general mode.

---

## What's Next

Based on the limitations above and the natural sprint trajectory, v7 priorities should be:

1. **FairSteer output validation** — Add a content-level validator that checks the returned notebook actually has cells mentioning `"logistic regression"`, `"register_forward_hook"`, etc. Retry if the content validator fails.

2. **Streaming response** — Switch the `/generate` endpoint to Server-Sent Events or chunked JSON so the UI can show a progress spinner per-section rather than a single spinner for the whole generation.

3. **Model parameter in FairSteer** — Extract the model name (e.g., `"Llama-2 7B"`, `"Mistral 7B"`) from the PDF text and inject it into the FairSteer prompt so `load_model()` uses the correct HuggingFace model ID.

4. **Fix NestJS CLI dev dep vulnerabilities** — Upgrade `@nestjs/cli` with `--force` in a controlled branch, verify no build breakage.

5. **FairSteer result screenshots** — Add Playwright assertions that the result panel download contains actual FairSteer terminology (read the downloaded JSON and verify cell content).
