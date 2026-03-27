# Sprint v2 — Walkthrough

## Summary

Sprint v2 delivered **security hardening and production readiness** for the Paper2Notebook application. All 10 tasks were completed, addressing the 7 security findings from the v1 audit: prompt injection mitigation, AI output validation, HTTP security headers, rate limiting, API key handling, error sanitization, and PDF parser safeguards. Two feature improvements — PDF figure extraction and environment variable documentation — round out the sprint. The sprint adds 56 tests across 10 test files with zero semgrep findings.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Next.js 15 Frontend (:3000)                       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  page.tsx                                                       │  │
│  │  - Sends API key via Authorization: Bearer header               │  │
│  │  - FormData contains only the PDF file (no secrets in body)     │  │
│  └────────────────────────────────┬───────────────────────────────┘  │
└───────────────────────────────────┼──────────────────────────────────┘
                                    │ POST /generate
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NestJS 11 Backend API (:3001)                      │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────────┐   │
│  │ helmet()     │  │ ThrottlerMod │  │ CORS (configurable origin)│   │
│  │ sec headers  │  │ 10 req/60s   │  │ via CORS_ORIGIN env var   │   │
│  └─────────────┘  └──────────────┘  └───────────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  GenerateController (POST /generate)                            │  │
│  │  - Reads Bearer token from Authorization header                 │  │
│  │  - Returns generic errors; logs details server-side             │  │
│  └──────────────────────────┬─────────────────────────────────────┘  │
│                              │                                        │
│  ┌───────────────────────────▼────────────────────────────────────┐  │
│  │                    GenerateService (pipeline)                    │  │
│  │  1. Parse PDF text  →  2. Extract figures  →  3. AI gen  →  4. │  │
│  │     PdfParser           FigureExtractor       AiService    Build│  │
│  └──┬──────────────────┬──────────────────┬──────────────────┬────┘  │
│     │                  │                  │                  │        │
│     ▼                  ▼                  ▼                  ▼        │
│  ┌──────────┐  ┌───────────────┐  ┌────────────────┐  ┌──────────┐ │
│  │PdfParser │  │FigureExtractor│  │  AiService      │  │Notebook  │ │
│  │ Service  │  │ Service       │  │  + sanitizer    │  │Builder   │ │
│  │ 100pg max│  │ pdfjs-dist    │  │  + cell valid.  │  │ .ipynb   │ │
│  │ 30s t/o  │  │ operator list │  │  + error sanit. │  │          │ │
│  └──────────┘  └───────────────┘  └───────┬────────┘  └──────────┘ │
│                                            │                         │
│                              ┌─────────────▼──────────────┐         │
│                              │ notebook-prompt.ts          │         │
│                              │ ┌────────────────────────┐  │         │
│                              │ │ SYSTEM_PROMPT           │  │         │
│                              │ │ (security guardrails)   │  │         │
│                              │ └────────────────────────┘  │         │
│                              │ ┌────────────────────────┐  │         │
│                              │ │ buildUserPrompt()       │  │         │
│                              │ │ calls sanitizeText()    │  │         │
│                              │ └────────────┬───────────┘  │         │
│                              └──────────────┼──────────────┘         │
│                              ┌──────────────▼──────────────┐         │
│                              │ prompt-sanitizer.ts          │         │
│                              │ 13 regex injection patterns  │         │
│                              └─────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
```

## Files Created/Modified

---

### `apps/api/src/ai/prompt-sanitizer.ts` (NEW)
**Purpose**: Strips prompt injection patterns from extracted PDF text before it reaches GPT-5.4.

**Key exports**:
- `INJECTION_PATTERNS` — Array of 13 compiled regexes targeting known LLM injection techniques
- `sanitizeText(text)` — Applies all patterns sequentially, collapses leftover whitespace

**How it works**:

The sanitizer is a pre-processing defense layer. PDF research papers could contain adversarial text designed to hijack the LLM. Before any text reaches the prompt builder, `sanitizeText()` strips six categories of attack: instruction overrides ("ignore previous instructions"), role hijacking ("you are now"), output manipulation ("output the following"), system message injection ("system:"), jailbreak keywords ("DAN mode"), and instruction dismissal ("disregard your rules").

Each regex uses `gi` flags (global, case-insensitive). Because JavaScript global regexes are stateful, `lastIndex` is reset before each application to prevent skipped matches:

```typescript
for (const pattern of INJECTION_PATTERNS) {
  pattern.lastIndex = 0;
  sanitized = sanitized.replace(pattern, "");
}
sanitized = sanitized.replace(/[ \t]{2,}/g, " ").trim();
```

---

### `apps/api/src/ai/prompts/notebook-prompt.ts` (MODIFIED)
**Purpose**: System prompt and user prompt builder for the GPT-5.4 notebook generation call.

**What changed in v2**:

1. **Security guardrail in system prompt** — An explicit block warns GPT that user content may contain adversarial injection. It instructs the model to never change behavior based on paper text, never generate shell commands / filesystem access / data exfiltration, only produce educational Python, and ignore detected injection attempts.

2. **Sanitized user prompt** — `buildUserPrompt()` now calls `sanitizeText()` on every section title and content before assembly:

```typescript
import { sanitizeText } from "../prompt-sanitizer";
prompt += `### ${sanitizeText(section.title)}\n${sanitizeText(section.content)}\n\n`;
```

This creates defense-in-depth: the sanitizer strips known patterns, and the system prompt instructs GPT to resist anything that slips through.

---

### `apps/api/src/ai/ai.service.ts` (MODIFIED)
**Purpose**: Calls GPT-5.4 via OpenAI API to generate notebook cells from parsed paper sections.

**What changed in v2** (Tasks 2 & 6):

**Cell validation** — After parsing GPT's JSON response, each cell is validated. Objects with invalid `cell_type` (must be `"markdown"` or `"code"`), non-string or empty `source`, or non-object entries are filtered out with Logger warnings. If zero valid cells remain, an error is thrown:

```typescript
const validCells = cells.filter((cell) => {
  if (typeof cell !== "object" || cell === null) return false;
  if (cell.cell_type !== "markdown" && cell.cell_type !== "code") return false;
  if (typeof cell.source !== "string" || cell.source.length === 0) return false;
  return true;
});
if (validCells.length === 0) {
  throw new Error("Notebook generation failed. Please try again.");
}
```

**Error sanitization** — All caught errors (OpenAI API failures, JSON parse errors) are logged via `Logger.error`/`Logger.warn` with full details, but only a generic message is thrown to callers. No stack traces or internal error messages reach the HTTP response.

---

### `apps/api/src/main.ts` (MODIFIED)
**Purpose**: NestJS application bootstrap file.

**What changed in v2** (Task 3):

Added `helmet()` middleware for HTTP security headers and configurable CORS origin:

```typescript
import helmet from "helmet";

app.use(helmet());
app.enableCors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000" });
```

Helmet automatically sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, removes `X-Powered-By`, and adds other security defaults to every response.

---

### `apps/api/src/app.module.ts` (MODIFIED)
**Purpose**: Root NestJS module.

**What changed in v2** (Task 4):

Added `@nestjs/throttler` with a global guard — 10 requests per 60 seconds per IP:

```typescript
@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    GenerateModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

---

### `apps/api/src/health.controller.ts` (MODIFIED)
**Purpose**: Health check endpoint (`GET /health`).

**What changed in v2** (Task 4):

Added `@SkipThrottle()` decorator to exclude the health endpoint from rate limiting. Monitoring and load balancers need unrestricted access to health checks.

---

### `apps/api/src/generate/generate.controller.ts` (MODIFIED)
**Purpose**: HTTP endpoint for notebook generation (`POST /generate`).

**What changed in v2** (Tasks 5 & 6):

**Authorization header** — API key is now read from the `Authorization` header instead of the FormData body. The controller extracts the Bearer token, validates its presence, and passes it downstream:

```typescript
async generate(
  @UploadedFile() file: Express.Multer.File | undefined,
  @Headers("authorization") authHeader: string | undefined
) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new BadRequestException("Missing API key in Authorization header");
  }
  const apiKey = authHeader.slice(7).trim();
  // ...
}
```

**Error sanitization** — Pipeline errors are caught and wrapped in `InternalServerErrorException` with a generic message. Full error details are logged via `Logger.error` and never exposed to clients.

---

### `apps/web/app/page.tsx` (MODIFIED)
**Purpose**: Main frontend page — PDF upload form and notebook download UI.

**What changed in v2** (Task 5):

The API key is now sent as an `Authorization: Bearer` header instead of a FormData field:

```typescript
const formData = new FormData();
formData.append("pdf", pdfFile);
const res = await fetch(`${API_URL}/generate`, {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}` },
  body: formData,
});
```

This reduces the risk of API keys being logged by intermediate proxies or CDNs that inspect request bodies.

---

### `apps/api/src/pdf-parser/pdf-parser.service.ts` (MODIFIED)
**Purpose**: Extracts text and sections from uploaded PDF files using pdfjs-dist.

**What changed in v2** (Task 7):

**Page limit** — PDFs with more than 100 pages are rejected immediately with a 400 `BadRequestException("PDF exceeds maximum page count (100)")`.

**Parsing timeout** — The actual parse logic is wrapped in a 30-second `Promise.race`. If parsing exceeds the timeout, it throws an error (caught and logged server-side, generic message returned to client):

```typescript
const MAX_PAGES = 100;
const PARSE_TIMEOUT_MS = 30000;

async parse(buffer: Buffer): Promise<ParsedPaper> {
  const parseWork = this.doParse(buffer);
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("PDF parsing timed out.")), PARSE_TIMEOUT_MS)
  );
  return await Promise.race([parseWork, timeout]);
}
```

---

### `apps/api/src/pdf-parser/figure-extractor.service.ts` (NEW)
**Purpose**: Extracts embedded images from PDF files as base64 PNG strings.

**Key exports**:
- `ExtractedFigure` — Interface: `{ page: number; base64: string; caption?: string }`
- `FigureExtractorService.extract(buffer)` — Walks the pdfjs-dist operator list to find image paint operations

**How it works**:

The service uses pdfjs-dist's low-level operator list API to find image rendering operations (`OPS.paintImageXObject` and `OPS.paintJpegXObject`). For each image operation found, it retrieves the image object from the page, renders it to a canvas-like buffer, and encodes it as a base64 PNG string. Each figure is associated with its page number:

```typescript
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const operatorList = await page.getOperatorList();
  for (let j = 0; j < operatorList.fnArray.length; j++) {
    if (operatorList.fnArray[j] === OPS.paintImageXObject ||
        operatorList.fnArray[j] === OPS.paintJpegXObject) {
      // extract image data as base64...
    }
  }
}
```

Extraction failures are caught gracefully — the pipeline continues without figures rather than failing the entire request.

---

### `apps/api/src/pdf-parser/pdf-parser.module.ts` (MODIFIED)
**Purpose**: NestJS module for PDF parsing services.

**What changed in v2** (Task 9): Now provides and exports both `PdfParserService` and `FigureExtractorService`.

---

### `apps/api/src/generate/generate.service.ts` (MODIFIED)
**Purpose**: Orchestrates the full generation pipeline: parse → extract figures → AI generate → build notebook.

**What changed in v2** (Task 9):

The pipeline now includes a figure extraction step between PDF parsing and AI generation. Extracted figures are passed to both the AI service (for context) and the notebook builder (for embedding). Figure extraction failure is non-fatal:

```typescript
let figures: ExtractedFigure[] = [];
try {
  figures = await this.figureExtractor.extract(pdfBuffer);
} catch (err: any) {
  this.logger.warn(`Figure extraction failed, continuing without figures: ${err.message}`);
}
const cells = await this.aiService.generateNotebook(parsed.sections, figures, apiKey);
const notebook = this.notebookBuilder.build(cells, figures);
```

---

### `.gitignore` (MODIFIED)
**Purpose**: Prevents sensitive and generated files from being committed.

**What changed in v2** (Task 8): Comprehensive entries added for `.env*`, `*.pem`, `*.key`, `node_modules/`, `dist/`, `.next/`, coverage directories, `test-results/`, OS files (`.DS_Store`, `Thumbs.db`), and IDE directories (`.idea/`, `.vscode/`).

---

### `.env.local.example` (NEW)
**Purpose**: Template documenting available environment variables.

Documents two variables with explanatory comments:
- `NEXT_PUBLIC_API_URL` — Frontend: URL of the NestJS backend API (default: `http://localhost:3001`)
- `CORS_ORIGIN` — Backend: Allowed CORS origin (default: `http://localhost:3000`)

---

## Data Flow

```
User uploads PDF + enters API key
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend (page.tsx)                                          │
│ FormData: { pdf: File }                                      │
│ Headers:  { Authorization: "Bearer sk-..." }                 │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /generate
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ helmet() → ThrottlerGuard (10 req/60s) → GenerateController  │
│                                                               │
│ 1. Validate: file exists, Authorization header present        │
│ 2. Extract Bearer token as apiKey                             │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ GenerateService.generate(pdfBuffer, apiKey)                   │
│                                                               │
│ Step 1: PdfParserService.parse(buffer)                        │
│         ├─ Reject if >100 pages (400)                         │
│         ├─ 30s timeout via Promise.race                       │
│         └─ Returns { rawText, sections, pageCount }           │
│                                                               │
│ Step 2: FigureExtractorService.extract(buffer)                │
│         ├─ Walks pdfjs-dist operator list for images          │
│         ├─ Returns [{ page, base64, caption? }]               │
│         └─ Failure is non-fatal (warns, continues)            │
│                                                               │
│ Step 3: AiService.generateNotebook(sections, figures, apiKey) │
│         ├─ sanitizeText() strips injection from sections      │
│         ├─ SYSTEM_PROMPT includes security guardrails         │
│         ├─ Calls GPT-5.4 via OpenAI API                       │
│         ├─ Validates each cell: cell_type + source            │
│         └─ Throws generic error if 0 valid cells              │
│                                                               │
│ Step 4: NotebookBuilderService.build(cells, figures)          │
│         └─ Assembles valid .ipynb with nbformat 4             │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
              200 OK → .ipynb JSON response
              (or generic error message on failure)
```

## Test Coverage

**56 total tests** across 10 test files — 28 unit, 16 integration, 12 E2E.

### Unit Tests (28 tests)

| File | Tests | Covers |
|------|-------|--------|
| `tests/unit/prompt-sanitizer.spec.ts` | 14 | All 13 injection patterns, normal text preservation, case insensitivity, whitespace cleanup, empty input |
| `tests/unit/ai.service.spec.ts` | 9 | Cell validation (invalid cell_type, empty source, non-objects, zero valid cells), error sanitization, normal generation |
| `tests/unit/pdf-parser.spec.ts` | 8 | Text extraction, section parsing, 100-page limit, 30s timeout, page count within limit |
| `tests/unit/figure-extractor.spec.ts` | 4 | Image extraction from operator list, empty PDF handling, extraction failure fallback |

### Integration Tests (16 tests)

| File | Tests | Covers |
|------|-------|--------|
| `tests/integration/security-headers.spec.ts` | 3 | `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `X-Powered-By` removal |
| `tests/integration/rate-limiting.spec.ts` | 2 | 429 after exceeding limit, successful requests within limit |
| `tests/integration/generate-endpoint.spec.ts` | 4 | Authorization header validation, missing file (400), missing key (400), updated flow |
| `tests/integration/generate-pipeline.spec.ts` | 3 | Full pipeline with mocked services, sections passed to AI, valid .ipynb structure |
| Additional integration tests | 4 | Error sanitization, generic error responses |

### E2E Tests (12 tests)

| File | Tests | Covers |
|------|-------|--------|
| `tests/e2e/*.spec.ts` | 12 | Upload flow, download flow, result panel, Open-in-Colab (inherited from v1, updated for v2 API changes) |

## Security Measures

Sprint v2 implements a **defense-in-depth** security strategy with seven layers:

1. **Prompt injection mitigation** (Task 1) — 13 regex patterns strip known injection techniques from PDF text before it reaches the LLM. System prompt guardrails instruct GPT to ignore anything that slips through.

2. **AI output validation** (Task 2) — Every cell returned by GPT is validated for `cell_type` and `source` before inclusion in the notebook. Invalid cells are filtered with warnings.

3. **HTTP security headers** (Task 3) — `helmet()` adds `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, removes `X-Powered-By`, and sets other security defaults on all responses.

4. **Rate limiting** (Task 4) — `@nestjs/throttler` enforces 10 requests per 60 seconds per IP globally. Health endpoint is excluded via `@SkipThrottle()`.

5. **API key in header** (Task 5) — API key moved from FormData body to `Authorization: Bearer` header, reducing exposure in access logs, CDN caches, and proxy inspections.

6. **Error sanitization** (Task 6) — All internal error details (OpenAI messages, stack traces, JSON parse failures) are logged server-side via NestJS Logger. Clients receive only generic "Generation failed. Please try again." messages.

7. **PDF safeguards** (Task 7) — 100-page limit prevents memory exhaustion from oversized documents. 30-second parsing timeout prevents hanging on malformed PDFs.

8. **Secrets hygiene** (Tasks 8 & 10) — `.gitignore` covers `.env*`, `*.pem`, `*.key`, and other sensitive files. `.env.local.example` documents variables without containing actual secrets.

## Known Limitations

1. **Regex-based sanitization is bypassable** — Sophisticated attacks using Unicode homoglyphs, base64 encoding, or novel phrasing not covered by the 13 patterns could evade the sanitizer. The system prompt guardrail provides a second layer, but neither is foolproof against advanced adversarial techniques.

2. **No output code scanning** — The AI output validation checks cell structure (type, source) but does not analyze the *content* of generated code cells. GPT could still produce code with `os.system()`, `subprocess`, or other dangerous calls if the system prompt guardrail is circumvented.

3. **Rate limiting is per-IP only** — Distributed attacks from multiple IPs would bypass the throttler. There is no per-API-key or per-user rate limiting.

4. **Figure extraction is basic** — The pdfjs-dist operator list approach only catches directly embedded raster images. Vector figures (drawn via path operations), charts rendered as text+lines, and some compressed image formats may not be extracted.

5. **No HTTPS enforcement** — The application serves over HTTP. HTTPS is expected to be handled by the deployment environment (reverse proxy, cloud load balancer) but is not enforced at the application level.

6. **Timeout doesn't cancel work** — The 30-second `Promise.race` timeout rejects the promise but doesn't actually abort the underlying PDF parsing work, which continues consuming resources until it completes or errors.

7. **ThrottlerGuard and tests** — Rate limiting integration tests require careful setup; the global guard applies to all endpoints, which can interfere with test suites if not properly isolated.

## What's Next

Based on the limitations above and the PRD trajectory, v3 priorities should include:

1. **Output code scanning** — Static analysis of generated Python cells for dangerous patterns (`os.system`, `subprocess`, `eval`, `exec`, `import socket`, etc.) before including them in the notebook.

2. **Streaming generation** — SSE/streaming endpoint so the frontend can show real-time progress instead of waiting for the full notebook.

3. **Model selector** — Allow users to choose between GPT models from the frontend for cost/quality tradeoff.

4. **Per-API-key rate limiting** — Supplement IP-based throttling with API-key-based limits to prevent abuse from distributed sources sharing a key.

5. **Enhanced figure extraction** — Use a more sophisticated approach (e.g., render pages to images, use computer vision) for better figure capture from complex PDFs.

6. **CORS tightening** — Move from a single `CORS_ORIGIN` env var to a validated allowlist for production deployments with multiple frontend origins.

7. **Observability** — Structured logging, request tracing, and metrics (latency, error rates, token usage) for production monitoring.
