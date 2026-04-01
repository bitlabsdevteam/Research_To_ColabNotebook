# Sprint v7 — Tasks

## Backlog

- [x] Task 1: Fix NestJS CLI dev-dep vulnerabilities (P0)
  - Acceptance: Run `npm install --save-dev @nestjs/cli@latest --legacy-peer-deps` in `apps/api`; `npm audit --omit=dev` exits 0 with zero high/critical findings; `npx nest build` succeeds; all 227 vitest tests still pass; record before/after `npm audit` summary in the completion note
  - Files: `apps/api/package.json`, `apps/api/package-lock.json`
  - Completed: 2026-04-01 — Root `package.json` `overrides` field added to force `path-to-regexp@^8.4.1` (patched version) across the workspace; `@nestjs/cli` upgrade alone was insufficient since the vulnerability was in the runtime dep `@nestjs/core`→`path-to-regexp@8.0.0-8.3.0`; before: 3 high severity (path-to-regexp GHSA-j3q9-mxjg-w52f, GHSA-27v5-c462-wpq7); after: `found 0 vulnerabilities`; `npx nest build` clean; 227/227 vitest green; semgrep clean

- [x] Task 2: Implement ModelExtractorService (P0)
  - Acceptance: New `apps/api/src/generate/model-extractor.service.ts` exports `ModelExtractorService` with method `extract(rawText: string): ModelInfo`; `ModelInfo` interface is `{ name: string; huggingfaceId: string; isDiffusion: boolean; modelClass: string }`; extraction rules (case-insensitive):
    - "dream" OR "diffusion language model" OR "masked diffusion" → `{ name: "Dream-7B", huggingfaceId: "Dream-org/Dream-v0-Instruct-7B", isDiffusion: true, modelClass: "AutoModel" }`
    - "llama-2" AND "7b" → `{ name: "Llama-2-7B", huggingfaceId: "meta-llama/Llama-2-7b-hf", isDiffusion: false, modelClass: "AutoModelForCausalLM" }`
    - "llama-3" OR "llama 3" AND "8b" → `{ name: "Llama-3-8B", huggingfaceId: "meta-llama/Meta-Llama-3-8B-Instruct", isDiffusion: false, modelClass: "AutoModelForCausalLM" }`
    - "mistral" AND "7b" → `{ name: "Mistral-7B", huggingfaceId: "mistralai/Mistral-7B-Instruct-v0.2", isDiffusion: false, modelClass: "AutoModelForCausalLM" }`
    - fallback → `{ name: "Unknown", huggingfaceId: "unknown/model", isDiffusion: false, modelClass: "AutoModelForCausalLM" }`
  - Registered as provider in `GenerateModule`; vitest unit tests cover all 5 cases including "dream" detection and "masked diffusion" synonym
  - Files: `apps/api/src/generate/model-extractor.service.ts`, `apps/api/src/generate/generate.module.ts`, `tests/unit/model-extractor.spec.ts`
  - Completed: 2026-04-01 — `ModelExtractorService.extract()` implemented with 4 ordered rules (Dream/diffusion first for priority, then Llama-3, Llama-2, Mistral, Unknown fallback); Dream detection triggers on "dream", "diffusion language model", or "masked diffusion" → `isDiffusion: true`, `modelClass: "AutoModel"`; registered in `GenerateModule`; 13 unit tests green (240/240 total); semgrep clean, npm audit --omit=dev 0 vulns

- [x] Task 3: Implement FairSteerContentValidator (P0)
  - Acceptance: New `apps/api/src/generate/fairsteer-content-validator.ts` exports `validateFairSteerContent(notebook: object): { valid: boolean; missing: string[] }`; it concatenates the `source` field of all notebook cells into a single string, then checks (case-insensitive) for ALL of the following required tokens:
    - `"AutoModel"` — correct Dream 7B model class
    - `"trust_remote_code"` — required for DreamModel custom code
    - `"mask_token_id"` — Dream-specific: ID 151666, used to exclude MASK positions
    - `"LogisticRegression"` — BAD classifier
    - `"output_hidden_states"` — activation extraction
    - `"register_forward_hook"` — DAS hook registration
    - `"diffusion_generate"` — Dream generation API (not model.generate)
    - `"DiffusionState"` — state-tracking class for multi-step hook
    - `"np.mean"` — DSV computation
    - `"PCA"` — DSV visualisation
  - `missing` array contains any absent token names; `GenerateService` calls this after `validateNotebook()` when `mode === "fairsteer"`; on missing tokens, retries with appended instruction: `"CRITICAL: Your FairSteer notebook for Dream 7B is missing required code. You MUST include: AutoModel (not AutoModelForCausalLM), trust_remote_code=True, mask_token_id (151666) for non-mask position detection, LogisticRegression for BAD, register_forward_hook on model.model.layers[best_layer].mlp, diffusion_generate() for generation, DiffusionState class with generation_tokens_hook_func, np.mean for DSV, and PCA scatter plot."` — if second attempt still fails content validation, throw `GenerationError` with message `"FairSteer notebook missing required Dream 7B code: [missing terms joined by ', ']"`; content validator is NOT called for `mode === "none"` notebooks
  - Files: `apps/api/src/generate/fairsteer-content-validator.ts`, `apps/api/src/generate/generate.service.ts`, `tests/unit/fairsteer-content-validator.spec.ts`
  - Completed: 2026-04-01 — `validateFairSteerContent()` implemented with 10 regex-based token checks; `AutoModel` uses negative lookahead `/automodel(?!for)/` to distinguish from `AutoModelForCausalLM`; `FAIRSTEER_CONTENT_RETRY_INSTRUCTION` exported alongside validator; `GenerateService` wires content validation after structural validation for mode=fairsteer — retry appends both structural + content instructions; `GenerationError` surfaces missing terms in message; 14 unit tests (254/254 total); semgrep clean, 0 prod vulns

- [ ] Task 4: Rewrite buildFairSteerPrompt for Dream 7B with full few-shot examples (P0)
  - Acceptance: `buildFairSteerPrompt(paperText: string, modelInfo: ModelInfo)` gains a second parameter with default `{ name: "Unknown", huggingfaceId: "unknown/model", isDiffusion: false, modelClass: "AutoModelForCausalLM" }`; the system prompt is rewritten to embed all three Dream 7B few-shot code examples below; `GenerateService` calls `this.modelExtractor.extract(parsed.rawText)` and passes `modelInfo` to `buildFairSteerPrompt`; vitest unit tests verify the prompt contains ALL required tokens from Task 3's validator list; the few-shot examples embedded in the system prompt MUST follow these exact patterns:

  **Load Model section (Dream 7B specific):**
  ```python
  import torch
  from transformers import AutoModel, AutoTokenizer
  MASK_TOKEN_ID = 151666

  model = AutoModel.from_pretrained(
      "Dream-org/Dream-v0-Instruct-7B",
      torch_dtype=torch.bfloat16,
      trust_remote_code=True
  ).eval().cuda()

  tokenizer = AutoTokenizer.from_pretrained(
      "Dream-org/Dream-v0-Instruct-7B",
      trust_remote_code=True
  )
  MASK_TOKEN_ID = tokenizer.mask_token_id  # 151666
  ```

  **BAD section (Dream 7B — mean-pool over non-mask positions, NOT last-token):**
  ```python
  def extract_activations(model, tokenizer, prompt_text):
      inputs = tokenizer(prompt_text, return_tensors="pt").to(model.device)
      input_ids = inputs["input_ids"]
      with torch.no_grad():
          out = model(input_ids, output_hidden_states=True)
      activations = []
      for hs in out.hidden_states:  # 29 tensors: embed + 28 transformer layers
          non_mask = (input_ids[0] != MASK_TOKEN_ID)
          pooled = hs[0][non_mask].mean(dim=0)
          activations.append(pooled.cpu().float().numpy())
      return np.stack(activations)  # (29, 3584)

  from sklearn.linear_model import LogisticRegression
  val_accuracies, probes = [], []
  for layer_idx in range(29):
      X = all_activations[:, layer_idx, :]
      clf = LogisticRegression(max_iter=1000, C=1.0)
      clf.fit(X_train, y_train)
      val_accuracies.append(clf.score(X_val, y_val))
      probes.append(clf)
  best_layer = int(np.argmax(val_accuracies))
  ```

  **DSV section:**
  ```python
  import numpy as np
  dsv_per_layer = []
  for layer_idx in range(29):
      acts_biased   = np.stack([extract_activations(model, tokenizer, p)[layer_idx] for p in biased_prompts])
      acts_unbiased = np.stack([extract_activations(model, tokenizer, p)[layer_idx] for p in unbiased_prompts])
      dsv = np.mean(acts_unbiased - acts_biased, axis=0)
      dsv_per_layer.append(dsv)
  ```

  **DAS section (Dream 7B — DiffusionState + generation_tokens_hook_func + register_forward_hook):**
  ```python
  class DiffusionState:
      current_x = None

  state = DiffusionState()

  def tokens_hook_func(step, x, logits):
      state.current_x = x
      return x

  def make_das_hook(probe, steering_vector, alpha, state, mask_token_id):
      sv = torch.from_numpy(steering_vector).float()
      def hook_fn(module, inp, output):
          if state.current_x is None:
              return output
          hidden = output[0].clone().float()
          for b in range(hidden.shape[0]):
              non_mask_pos = (state.current_x[b] != mask_token_id).nonzero(as_tuple=True)[0]
              if len(non_mask_pos) == 0:
                  continue
              last_pos = non_mask_pos[-1].item()
              act = hidden[b, last_pos, :].cpu().numpy()
              y_hat = probe.predict([act])
              if y_hat[0] == 0:
                  hidden[b, last_pos, :] += alpha * sv.to(hidden.device)
          return (hidden.to(output[0].dtype),) + output[1:]
      return hook_fn

  # Register hook: path is model.model.layers[best_layer].mlp
  hook_handle = model.model.layers[best_layer].mlp.register_forward_hook(
      make_das_hook(probes[best_layer], dsv_per_layer[best_layer], alpha=20, state=state, mask_token_id=MASK_TOKEN_ID)
  )

  messages = [{"role": "user", "content": sample_question}]
  inputs = tokenizer.apply_chat_template(messages, return_tensors="pt", return_dict=True, add_generation_prompt=True).to(model.device)

  output = model.diffusion_generate(
      inputs["input_ids"],
      attention_mask=inputs["attention_mask"],
      max_new_tokens=200,
      steps=200,
      temperature=0.0,
      alg="entropy",
      generation_tokens_hook_func=tokens_hook_func,
      return_dict_in_generate=True,
  )
  hook_handle.remove()
  answer_after = tokenizer.decode(output.sequences[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
  ```

  - Files: `apps/api/src/generate/prompts/fairsteer.prompt.ts`, `apps/api/src/generate/generate.service.ts`, `tests/unit/fairsteer-prompt.spec.ts`

- [ ] Task 5: Add SSE streaming endpoint to NestJS (P0)
  - Acceptance: New `GET /generate/stream` endpoint in `GenerateController` using NestJS `@Sse()` decorator; accepts multipart `pdf` file (via `@UploadedFile()`) and `Authorization: Bearer <key>` header; reads `mode` from query param `?mode=fairsteer`; `GenerateService.generateStream(pdfBuffer, apiKey, mode)` returns `Observable<MessageEvent>` using RxJS `Subject`; the Observable emits events in this exact order:
    1. `{ event: "parsing", data: JSON.stringify({ message: "Extracting PDF text..." }) }`
    2. `{ event: "generating", data: JSON.stringify({ message: "Calling AI (attempt 1/2)...", model: modelInfo.name }) }`
    3. (on retry) `{ event: "generating", data: JSON.stringify({ message: "Calling AI (attempt 2/2)...", model: modelInfo.name }) }`
    4. `{ event: "validating", data: JSON.stringify({ message: "Validating notebook structure and content..." }) }`
    5. `{ event: "complete", data: JSON.stringify(notebook) }` OR `{ event: "error", data: JSON.stringify({ error: message }) }`
  - On `GenerationError`, emits `error` event and completes the Subject; unit test mocks service and verifies Observable emits events in correct sequence; use `@UseInterceptors(FileInterceptor("pdf"))` same as existing POST endpoint
  - Files: `apps/api/src/generate/generate.controller.ts`, `apps/api/src/generate/generate.service.ts`, `tests/unit/generate-stream.spec.ts`

- [ ] Task 6: Frontend SSE integration — GenerationProgress component (P0)
  - Acceptance: New `apps/web/app/components/GenerationProgress.tsx` renders `<div data-testid="generation-progress">` containing 4 stage rows (`data-testid="stage-parsing"`, `"stage-generating"`, `"stage-validating"`, `"stage-complete"`); each row shows: a label ("Parsing PDF", "Calling AI", "Validating", "Complete") and a status icon — waiting = grey dot, active = animated spinner div, done = "✓" text, error = "✗" text; in `page.tsx`, replace `handleGenerate()` with `handleGenerateStream()`: use `fetch()` with `ReadableStream` against `GET /generate/stream` (passing `pdf` as multipart via a POST-then-SSE pattern OR switching to `EventSource` with query params — choose EventSource with base64-encoded PDF as query param if under 1MB, else keep POST `/generate` non-streaming and show progress stages as local timed state); on `complete` event: `setNotebook(JSON.parse(event.data))`, close stream; on `error` event: `setError(data.error)`, close stream; `GenerationProgress` is shown between the Generate button and the ResultPanel when `isLoading === true`; Playwright test verifies `generation-progress` renders when loading, all 4 stage labels are visible, stages update to done after `complete` event; screenshot `tests/screenshots/task6v7-01-progress-stages.png`
  - Files: `apps/web/app/components/GenerationProgress.tsx`, `apps/web/app/page.tsx`, `tests/e2e/generation-progress.spec.ts`

- [ ] Task 7: FairSteer content validation integration test (P1)
  - Acceptance: New `tests/integration/fairsteer-content-validation.spec.ts`; it sends POST to NestJS `/generate` with a minimal PDF buffer and `mode=fairsteer`; mocks `AiService.generateNotebook` to return on first call a notebook that passes structural validation but is missing `"register_forward_hook"` and `"DiffusionState"` (both required by Task 3's validator); on second call returns a valid Dream 7B notebook containing all 10 required tokens; verifies: (a) mock was called exactly twice (retry occurred), (b) response status 200, (c) returned notebook cells contain `"register_forward_hook"`, `"DiffusionState"`, `"diffusion_generate"`, `"mask_token_id"`; adds a second test where both calls return missing tokens → verifies HTTP 422 with error message listing missing terms; all 227 existing vitest tests still pass
  - Files: `tests/integration/fairsteer-content-validation.spec.ts`

- [ ] Task 8: Sprint v7 smoke test and full suite verification (P1)
  - Acceptance: New `tests/e2e/sprint-v7-smoke.spec.ts` with 4 tests: (a) `generation-progress` component renders with all 4 stage labels visible in FairSteer mode; (b) mocked SSE stream emitting parsing→generating→validating→complete results in ResultPanel rendering; (c) mocked SSE `error` event shows error pill with the error message; (d) switching mode fairsteer→none→fairsteer preserves correct mode in request body; all existing Playwright (137+) and vitest (227+) tests still pass; `npm audit --omit=dev` exits 0; semgrep clean; screenshots `tests/screenshots/task8v7-01-progress-fairsteer.png` through `task8v7-04-mode-switch.png`
  - Files: `tests/e2e/sprint-v7-smoke.spec.ts`, `tests/screenshots/`
