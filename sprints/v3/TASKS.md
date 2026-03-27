# Sprint v3 — Tasks

## Backlog

- [x] Task 1: Unit tests — GenerateService, GenerateController, notebook-prompt (P0)
  - Acceptance: `GenerateService` has 6+ unit tests covering: successful pipeline, PDF parse failure, figure extraction failure (graceful fallback), AI generation failure, and correct argument passing to each dependency. `GenerateController` has 6+ unit tests covering: missing file (400), missing Authorization header (400), invalid Bearer format (400), successful generation, pipeline error → generic 500, and correct apiKey extraction. `notebook-prompt.ts` has 5+ unit tests covering: `buildSystemPrompt()` contains security guardrail, `buildUserPrompt()` calls sanitizeText, handles empty sections, handles sections with special characters, and output format. All tests use mocked dependencies.
  - Files: `tests/unit/generate.service.spec.ts`, `tests/unit/generate.controller.spec.ts`, `tests/unit/notebook-prompt.spec.ts`
  - Completed: 2026-03-27 — 25 new unit tests (8 GenerateService, 8 GenerateController, 9 notebook-prompt), all 81 tests passing

- [ ] Task 2: Unit tests — NotebookBuilderService expanded coverage (P0)
  - Acceptance: `NotebookBuilderService` has 10+ total unit tests (5 existing + 5 new). New tests cover: figures are embedded as image cells, empty figures array produces no image cells, cells with special characters in source are preserved, notebook metadata includes `colab` and `kernelspec` fields, and `nbformat` is exactly 4. Existing tests remain passing.
  - Files: `tests/unit/notebook-builder.spec.ts`

- [ ] Task 3: Integration tests — expanded /generate endpoint with mocked AI (P0)
  - Acceptance: 4+ new integration tests added. Tests cover: successful generation returns valid .ipynb structure with correct nbformat, request with invalid PDF content returns appropriate error, request exceeding rate limit returns 429, and concurrent requests are handled correctly. All tests use mocked `AiService` and `PdfParserService`. Existing integration tests remain passing.
  - Files: `tests/integration/generate-endpoint.spec.ts`

- [ ] Task 4: E2E Playwright — full user flow with screenshots (P0)
  - Acceptance: A new Playwright E2E test covers the complete user flow: (1) navigate to home page — screenshot, (2) enter API key — screenshot, (3) upload a test PDF — screenshot, (4) click Generate — screenshot showing loading spinner, (5) wait for result — screenshot showing download button. Each screenshot saved to `tests/screenshots/task4-NN-description.png`. Tests use `data-testid` selectors. Tests run against a locally started dev server with mocked backend responses.
  - Files: `tests/e2e/full-flow.spec.ts`, `tests/screenshots/task4-*.png`

- [ ] Task 5: Real quality test — visible browser with real PDF (P1)
  - Acceptance: A Playwright test configured with `headless: false` opens a visible browser. It navigates to the app, enters an API key from `OPENAI_API_KEY` env var, uploads the "Attention Is All You Need" PDF (path from `TEST_PDF_PATH` env var, default: `tests/fixtures/attention-is-all-you-need.pdf`), clicks Generate, and waits for the result. Validates: response is valid JSON, notebook has 4+ code cells, notebook has 4+ markdown cells, at least one code cell contains valid Python (imports or function definitions), and the system prompt security disclaimer is not leaked into cell content. Screenshots at each step. Test is skipped if `OPENAI_API_KEY` is not set (so CI doesn't fail).
  - Files: `tests/e2e/quality-test.spec.ts`, `tests/screenshots/task5-*.png`

- [ ] Task 6: GitHub Actions CI workflow — tests + security scans (P0)
  - Acceptance: `.github/workflows/ci.yml` runs on every push and pull_request. Jobs: (1) `test` — installs dependencies, runs `npm run test` (vitest unit + integration), runs Playwright E2E tests with `npx playwright install chromium` first. (2) `security` — runs `npx semgrep --config auto apps/ --quiet` and `npm audit --production`. Both jobs must pass for the workflow to succeed. Uses Node.js 20. Caches `node_modules` and Playwright browsers. The quality test (Task 5) is NOT included in CI (it requires a real API key).
  - Files: `.github/workflows/ci.yml`

- [ ] Task 7: GitHub branch protection + repo setup via gh CLI (P1)
  - Acceptance: A shell script `scripts/setup-github.sh` uses `gh` CLI to: (1) ensure the repo has a remote origin, (2) set branch protection on `main` requiring the CI checks to pass before merge, (3) require at least 1 approval on PRs (if applicable), (4) print a summary of the configured protections. Script is idempotent (safe to run multiple times). README-style comments explain each `gh` command.
  - Files: `scripts/setup-github.sh`

- [ ] Task 8: Dockerfiles for backend and frontend (P0)
  - Acceptance: `apps/api/Dockerfile` is a multi-stage build: stage 1 installs deps and builds with `npm run build`, stage 2 copies only `dist/` and production `node_modules` into a slim Node 20 Alpine image, exposes port 3001, runs `node dist/main`. `apps/web/Dockerfile` is a multi-stage build: stage 1 installs deps and builds with `npm run build`, stage 2 serves the Next.js standalone output with Node 20 Alpine, exposes port 3000. Both images are under 200MB. `docker build` succeeds for both without errors.
  - Files: `apps/api/Dockerfile`, `apps/web/Dockerfile`

- [ ] Task 9: docker-compose.yml for local orchestration (P0)
  - Acceptance: Root `docker-compose.yml` defines two services: `backend` (builds from `apps/api/Dockerfile`, port 3001, env vars for CORS_ORIGIN) and `frontend` (builds from `apps/web/Dockerfile`, port 3000, env var for NEXT_PUBLIC_API_URL pointing to backend). `docker compose up --build` starts both services and they can communicate. A `.env.docker` example file documents the required env vars. Health check configured for backend service.
  - Files: `docker-compose.yml`, `.env.docker`

- [ ] Task 10: Terraform AWS ECS Fargate + CD pipeline (P1)
  - Acceptance: `infra/main.tf` defines: VPC with public subnets, ECS cluster, ECR repositories (frontend + backend), ECS task definitions for both services, ECS services with Fargate launch type, Application Load Balancer routing `/` to frontend and `/api/*` to backend, security groups allowing HTTP/HTTPS inbound. S3 backend block for remote state. Variables for region, image tags. `infra/variables.tf` and `infra/outputs.tf` created. `.github/workflows/cd.yml` triggers on push to main (after CI passes): builds Docker images, pushes to ECR, updates ECS services with new task definitions. AWS credentials from GitHub Secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`). `terraform plan` succeeds without errors (does NOT apply — that's manual for first deploy).
  - Files: `infra/main.tf`, `infra/variables.tf`, `infra/outputs.tf`, `.github/workflows/cd.yml`
