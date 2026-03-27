# Sprint v2 — Tasks

## Backlog

- [x] Task 1: Prompt injection mitigation — sanitize PDF text and add guardrails (P0)
  - Acceptance: A `PromptSanitizer` utility strips instruction-like patterns (e.g., "ignore previous instructions", "you are now", "output the following") from extracted PDF text before it reaches the prompt. The system prompt includes an explicit guardrail warning GPT that user content may contain injection attempts. Unit tests confirm known injection patterns are stripped while normal academic text is preserved.
  - Files: `apps/api/src/ai/prompt-sanitizer.ts`, `apps/api/src/ai/prompts/notebook-prompt.ts`, `tests/unit/prompt-sanitizer.spec.ts`
  - Completed: 2026-03-27 — PromptSanitizer with 13 regex patterns, security guardrail in system prompt, sanitizeText() applied in buildUserPrompt(), 14 unit tests passing

- [x] Task 2: AI response validation — validate cell structure returned by GPT (P0)
  - Acceptance: After parsing GPT's JSON response, each cell is validated: `cell_type` must be `"markdown"` or `"code"`, `source` must be a non-empty string. Invalid cells are filtered out with a warning logged. If zero valid cells remain, an error is thrown. Unit test confirms invalid cells are rejected and valid cells pass through.
  - Files: `apps/api/src/ai/ai.service.ts`, `tests/unit/ai.service.spec.ts`
  - Completed: 2026-03-27 — Cell validation with Logger warnings, filters invalid cell_type/source/non-objects, throws on zero valid cells, 4 new unit tests

- [x] Task 3: Security headers — add helmet middleware (P0)
  - Acceptance: `helmet` is installed and applied as global middleware in `main.ts`. All API responses include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and other helmet defaults. Integration test verifies headers are present on the `/health` endpoint response.
  - Files: `apps/api/src/main.ts`, `apps/api/package.json`, `tests/integration/security-headers.spec.ts`
  - Completed: 2026-03-27 — helmet installed and applied in main.ts, 3 integration tests verify nosniff, X-Frame-Options, X-Powered-By removal

- [x] Task 4: Rate limiting — add @nestjs/throttler to the API (P0)
  - Acceptance: `@nestjs/throttler` is installed and configured globally (10 requests per 60 seconds per IP). The `/generate` endpoint returns 429 Too Many Requests when the limit is exceeded. The `/health` endpoint is excluded from throttling via `@SkipThrottle()`. Integration test confirms 429 after exceeding the limit.
  - Files: `apps/api/src/app.module.ts`, `apps/api/src/health.controller.ts`, `apps/api/src/main.ts`, `apps/api/package.json`, `tests/integration/rate-limiting.spec.ts`
  - Completed: 2026-03-27 — ThrottlerModule (10 req/60s) with global guard, @SkipThrottle on health, 2 integration tests

- [x] Task 5: Move API key to Authorization header (P0)
  - Acceptance: Frontend sends API key as `Authorization: Bearer <key>` header instead of in FormData body. Backend reads the key from the `Authorization` header, strips the `Bearer ` prefix, validates it. The `apiKey` field is removed from FormData. Both frontend and backend tests updated. E2E test confirms the flow still works end-to-end.
  - Files: `apps/web/app/page.tsx`, `apps/api/src/generate/generate.controller.ts`, `tests/integration/generate-endpoint.spec.ts`, `tests/e2e/result-panel.spec.ts`
  - Completed: 2026-03-27 — Backend reads from Authorization header, frontend sends Bearer token, all integration tests updated and passing

- [ ] Task 6: Error message sanitization — generic errors to client, details server-side (P0)
  - Acceptance: `AiService` and `GenerateController` catch errors and return generic messages to the client (e.g., "Generation failed. Please try again.") while logging full error details server-side via NestJS Logger. OpenAI error messages, JSON parse failures, and stack traces are never exposed in HTTP responses. Unit test confirms error details are not in the response body.
  - Files: `apps/api/src/ai/ai.service.ts`, `apps/api/src/generate/generate.controller.ts`, `tests/unit/ai.service.spec.ts`, `tests/integration/generate-endpoint.spec.ts`

- [ ] Task 7: PDF parser safeguards — page limit and parsing timeout (P0)
  - Acceptance: `PdfParserService` rejects PDFs with more than 100 pages (returns 400 with "PDF exceeds maximum page count"). Parsing is wrapped in a 30-second timeout (returns 500 with generic error if exceeded). Unit tests confirm both limits are enforced.
  - Files: `apps/api/src/pdf-parser/pdf-parser.service.ts`, `tests/unit/pdf-parser.spec.ts`

- [ ] Task 8: Add .gitignore with security entries (P1)
  - Acceptance: Root `.gitignore` includes entries for `.env*`, `node_modules/`, `dist/`, `.next/`, `*.pem`, `*.key`, coverage directories, and OS files. Verified by running `git status` and confirming no ignored files are tracked.
  - Files: `.gitignore`

- [ ] Task 9: PDF figure extraction service — extract images from PDF (P1)
  - Acceptance: Given a PDF buffer, `FigureExtractorService` extracts embedded images as base64 PNG strings using `pdfjs-dist` operator list. Associates figures with page numbers. Returns array of `{ page, base64, caption? }`. `GenerateService` passes extracted figures to the AI service and notebook builder. Unit test confirms extraction from a test PDF with images.
  - Files: `apps/api/src/pdf-parser/figure-extractor.service.ts`, `apps/api/src/pdf-parser/pdf-parser.module.ts`, `apps/api/src/generate/generate.service.ts`, `tests/unit/figure-extractor.spec.ts`

- [ ] Task 10: Frontend API key header + .env.local example (P2)
  - Acceptance: An `.env.local.example` file documents available environment variables (`NEXT_PUBLIC_API_URL`, `CORS_ORIGIN`). README-style comments explain each variable. File is committed as a template (actual `.env.local` is gitignored).
  - Files: `.env.local.example`
