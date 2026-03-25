# Sprint v1 — Tasks

## Backlog

- [x] Task 1: Project setup — monorepo with Next.js frontend + NestJS backend (P0)
  - Acceptance: `npm run dev` starts both frontend (port 3000) and backend (port 3001). Linting and TypeScript compilation pass. Basic health-check endpoint returns 200.
  - Files: `package.json`, `apps/web/` (Next.js), `apps/api/` (NestJS), `turbo.json` or root scripts
  - Completed: 2026-03-25 — Turborepo monorepo with Next.js 15 + NestJS 11, health endpoint verified, TS compiles clean

- [x] Task 2: API key input UI — frontend component for entering OpenAI key (P0)
  - Acceptance: Landing page renders with a text input for API key (masked). Key is stored in React context. A "key set" indicator shows when key is present. Key is never sent to backend except with generation requests.
  - Files: `apps/web/app/page.tsx`, `apps/web/app/context/ApiKeyContext.tsx`, `apps/web/app/components/ApiKeyInput.tsx`
  - Completed: 2026-03-25 — ApiKeyContext + ApiKeyInput component with masked input and green "Key set" indicator

- [x] Task 3: PDF upload UI — drag-and-drop file upload with validation (P0)
  - Acceptance: Dropzone component accepts `.pdf` files only (max 20 MB). Shows file name and size after selection. Upload button is disabled until both API key and PDF are present. Visual feedback on drag-over.
  - Files: `apps/web/app/components/PdfUpload.tsx`, `apps/web/app/components/GenerateButton.tsx`
  - Completed: 2026-03-25 — PdfUpload dropzone with validation + GenerateButton disabled/enabled logic

- [x] Task 4: PDF upload endpoint — NestJS receives and validates PDF files (P0)
  - Acceptance: `POST /api/generate` accepts multipart form data with `pdf` file and `apiKey` string. Validates file is PDF and under 20 MB. Returns 400 on invalid input. Stores file temporarily in memory/tmp.
  - Files: `apps/api/src/generate/generate.controller.ts`, `apps/api/src/generate/generate.module.ts`, `apps/api/src/generate/dto/generate.dto.ts`
  - Completed: 2026-03-25 — GenerateController with Multer file upload, PDF/apiKey validation, 20MB limit

- [x] Task 5: PDF text extraction service — parse PDF into structured text (P0)
  - Acceptance: Given a PDF buffer, extracts full text with page boundaries. Identifies sections (Abstract, Introduction, Methods, etc.) by heading patterns. Returns structured JSON with sections and raw text. Unit test with a sample PDF passes.
  - Files: `apps/api/src/pdf-parser/pdf-parser.service.ts`, `apps/api/src/pdf-parser/pdf-parser.module.ts`, `tests/unit/pdf-parser.spec.ts`
  - Completed: 2026-03-25 — PdfParserService using pdfjs-dist, extracts text + identifies sections via regex heading patterns

- [ ] Task 6: PDF figure extraction service — extract images/diagrams from PDF (P1)
  - Acceptance: Given a PDF buffer, extracts embedded images as base64 PNG strings. Associates figures with page numbers. Returns array of `{ page, base64, caption? }`. Unit test confirms extraction from a test PDF with images.
  - Files: `apps/api/src/pdf-parser/figure-extractor.service.ts`, `tests/unit/figure-extractor.spec.ts`

- [x] Task 7: AI notebook generation service — GPT-5.4 generates notebook content (P0)
  - Acceptance: Takes structured paper content (sections + figures) and API key. Sends structured prompt to GPT-5.4 requesting tutorial-style notebook cells. Returns array of notebook cells (markdown + code). Handles API errors gracefully. Unit test with mocked OpenAI response passes.
  - Files: `apps/api/src/ai/ai.service.ts`, `apps/api/src/ai/ai.module.ts`, `apps/api/src/ai/prompts/notebook-prompt.ts`, `tests/unit/ai.service.spec.ts`
  - Completed: 2026-03-25 — AiService with GPT-5.4 prompt, structured system/user messages, JSON cell parsing, error handling

- [x] Task 8: Notebook builder — assemble .ipynb JSON from generated cells (P0)
  - Acceptance: Takes array of cells (markdown/code) and produces valid `.ipynb` JSON (nbformat 4). Includes Colab metadata. Embeds figures as base64 in markdown cells. Unit test validates output against nbformat schema.
  - Files: `apps/api/src/notebook/notebook-builder.service.ts`, `apps/api/src/notebook/notebook.module.ts`, `tests/unit/notebook-builder.spec.ts`
  - Completed: 2026-03-25 — NotebookBuilderService producing nbformat 4.5 with Colab metadata, line-split sources, figure embedding

- [ ] Task 9: End-to-end pipeline — wire all services into the generate endpoint (P0)
  - Acceptance: `POST /api/generate` with a PDF and API key returns a valid `.ipynb` file. Pipeline: upload → parse → extract figures → AI generate → build notebook → respond. Integration test with mocked AI passes.
  - Files: `apps/api/src/generate/generate.service.ts`, `tests/integration/generate.spec.ts`

- [ ] Task 10: Download and Open-in-Colab UI — frontend result handling (P0)
  - Acceptance: After generation completes, UI shows two buttons: "Download .ipynb" (triggers browser download) and "Open in Colab" (opens `colab.research.google.com/notebooks/` with notebook upload). Loading state shown during generation. Error messages displayed on failure.
  - Files: `apps/web/app/components/ResultPanel.tsx`, `apps/web/app/lib/colab.ts`, `apps/web/app/page.tsx`
