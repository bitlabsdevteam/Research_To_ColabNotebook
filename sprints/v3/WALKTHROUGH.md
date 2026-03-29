# Sprint v3 — Walkthrough

## Summary

Sprint v3 took the security-hardened Paper2Notebook application from v2 and made it fully production-ready. The sprint added a comprehensive test suite following the testing pyramid (unit → integration → E2E), a two-stage GitHub Actions CI/CD pipeline that blocks broken merges and auto-deploys on every push to `main`, and live AWS infrastructure deployed via Terraform — VPC, ECS Fargate, ECR, ALB, and CloudWatch logs all provisioned and running. As of sprint close, both frontend and backend containers are live at the ALB endpoint and the full CI/CD loop is operational.

---

## Architecture Overview

```
 Developer
    │
    ├── git push / PR ──────────────────────────────────┐
    │                                                    ▼
    │                                      ┌────────────────────────┐
    │                                      │  GitHub Actions: CI    │
    │                                      │  ┌──────────────────┐  │
    │                                      │  │ job: test        │  │
    │                                      │  │  - vitest        │  │
    │                                      │  │  - playwright E2E│  │
    │                                      │  └──────────────────┘  │
    │                                      │  ┌──────────────────┐  │
    │                                      │  │ job: security    │  │
    │                                      │  │  - semgrep       │  │
    │                                      │  │  - npm audit     │  │
    │                                      │  └──────────────────┘  │
    │                                      │  ✗ blocks merge if     │
    │                                      │    any check fails     │
    │                                      └────────────────────────┘
    │
    └── merge to main ──────────────────────────────────┐
                                                        ▼
                                         ┌────────────────────────┐
                                         │  GitHub Actions: CD    │
                                         │  1. docker buildx      │
                                         │     (linux/amd64)      │
                                         │  2. push to ECR        │
                                         │  3. ecs update-service │
                                         │  4. wait stable        │
                                         └────────────┬───────────┘
                                                      │
                                                      ▼
                              ┌───────────────────────────────────────┐
                              │         AWS (ap-northeast-1)          │
                              │                                       │
                              │  ┌─────────────────────────────────┐ │
                              │  │   Application Load Balancer      │ │
                              │  │   paper2notebook-alb-*.elb.aws   │ │
                              │  │                                  │ │
                              │  │  /           → frontend:3000     │ │
                              │  │  /generate*  → backend:3001      │ │
                              │  │  /health*    → backend:3001      │ │
                              │  └────────────┬──────────┬──────────┘ │
                              │               │          │            │
                              │  ┌────────────▼─┐  ┌────▼──────────┐ │
                              │  │  ECS Fargate │  │  ECS Fargate  │ │
                              │  │  Frontend    │  │  Backend      │ │
                              │  │  Next.js     │  │  NestJS       │ │
                              │  │  :3000       │  │  :3001        │ │
                              │  └──────────────┘  └───────────────┘ │
                              │                                       │
                              │  ECR: paper2notebook-backend          │
                              │  ECR: paper2notebook-frontend         │
                              │  S3:  paper-to-notebook-tf-state      │
                              │  CW:  /ecs/paper2notebook-*           │
                              └───────────────────────────────────────┘

 Local Dev
 ┌──────────────────────────────────┐
 │  docker compose up --build       │
 │  frontend:3000 → backend:3001    │
 │  (healthcheck gates startup)     │
 └──────────────────────────────────┘
```

---

## Files Created/Modified

### `tests/unit/generate.service.spec.ts`

**Purpose**: Unit tests for `GenerateService` — the orchestrator that chains PDF parsing → figure extraction → AI generation → notebook building.

**Key Tests**:
- Verifies `pdfParser.parse` is called with the raw buffer
- Verifies `figureExtractor.extract` is called with the raw buffer
- Verifies `aiService.generateNotebook` receives parsed sections, figures, and the API key
- **Graceful fallback**: when figure extraction throws, the pipeline continues with an empty figures array rather than crashing
- Verifies PDF parse failures and AI failures propagate as errors

**How it works**:

All four dependencies (`PdfParserService`, `FigureExtractorService`, `AiService`, `NotebookBuilderService`) are replaced with `vi.fn()` mocks. The service is instantiated directly (no NestJS DI container), making tests fast and deterministic.

The graceful fallback test is the most important — it proves the app degrades cleanly when figure extraction fails on a scanned or image-only PDF:

```typescript
it("continues with empty figures when figureExtractor throws", async () => {
  mockExtract.mockRejectedValue(new Error("extraction failed"));
  const result = await service.generate(buf, "sk-test");
  expect(mockGenerateNotebook).toHaveBeenCalledWith(fakeSections, [], "sk-test");
  expect(result).toEqual(fakeNotebook);
});
```

---

### `tests/unit/generate.controller.spec.ts`

**Purpose**: Unit tests for `GenerateController` — validates input, extracts the Bearer token, and maps pipeline errors to safe HTTP responses.

**Key Tests**:
- Missing file → `BadRequestException`
- Missing `Authorization` header → `BadRequestException`
- Non-Bearer scheme (e.g. `Basic ...`) → `BadRequestException`
- Empty Bearer token → `BadRequestException`
- Pipeline error → `InternalServerErrorException` with a **generic** message (never leaks internal error text)
- Correct API key extraction from `Bearer sk-xxx`

**How it works**:

The security-critical test verifies that raw error messages from the pipeline are never forwarded to the client:

```typescript
it("throws InternalServerErrorException with generic message when pipeline fails", async () => {
  mockGenerate.mockRejectedValue(new Error("Secret internal error details"));
  try {
    await controller.generate(fakeFile, "Bearer sk-test");
  } catch (e: any) {
    expect(e).toBeInstanceOf(InternalServerErrorException);
    expect(e.message).not.toContain("Secret internal");
    expect(e.getResponse().message).toBe("Generation failed. Please try again.");
  }
});
```

---

### `tests/unit/notebook-prompt.spec.ts`

**Purpose**: Unit tests for `notebook-prompt.ts` — the functions that build the system and user prompts sent to the AI.

**Key Tests**:
- `buildSystemPrompt()` contains the security guardrail phrase
- `buildUserPrompt()` calls `sanitizeText` on section content (preventing prompt injection)
- Handles empty sections array without throwing
- Handles sections with special characters (`<`, `>`, `"`, `\n`) without breaking
- Output format contains required structural markers

---

### `tests/unit/notebook-builder.spec.ts`

**Purpose**: Expanded unit tests for `NotebookBuilderService` — the service that assembles raw AI cells and figures into a valid `.ipynb` file.

**New tests added** (5 additional on top of 5 existing):
- Figures are embedded as image cells with correct `base64` data
- Empty figures array produces zero image cells
- Cell source with special characters is preserved exactly
- Notebook metadata includes both `colab` and `kernelspec` fields
- `nbformat` is exactly `4` (not `"4"` or `4.x`)

---

### `tests/integration/generate-endpoint.spec.ts`

**Purpose**: Integration tests for the `POST /generate` endpoint — tests the full NestJS HTTP layer with mocked AI and PDF services.

**Tests** (8 total, 4 new this sprint):
- Valid request returns a `.ipynb` structure with correct `nbformat`
- Empty `Authorization` header → 400
- Wrong auth scheme (`Token ...` instead of `Bearer ...`) → 400
- AI failure → generic 500 (no internal detail leaked)

---

### `tests/e2e/full-flow.spec.ts`

**Purpose**: Playwright E2E tests covering the complete browser user flow against a locally running dev server with mocked backend.

**How it works**:

A minimal valid PDF is created in `beforeAll` and deleted in `afterAll` to avoid committing binary fixtures. The backend API is intercepted with `page.route("**/generate", ...)` so the test is fully deterministic and doesn't require a running backend or OpenAI key.

The test verifies `data-testid` selectors at each step:

```
/ → app-title visible, generate-button disabled
→ fill api-key-input → generate-button still disabled (no PDF)
→ setInputFiles on pdf-file-input → generate-button enabled
→ click generate-button → loading state screenshot
→ result-panel visible → download-button + open-colab-button visible
```

Screenshots saved to `tests/screenshots/task4-0N-*.png`.

**Error flow test**: Mocks backend to return 500, asserts `error-message` is visible and `result-panel` is not.

---

### `tests/e2e/quality-test.spec.ts`

**Purpose**: Real quality validation test — runs in a visible (headful) browser with an actual OpenAI API key against a real PDF.

**How it works**:

The test is skipped automatically if `OPENAI_API_KEY` is not set, so it never runs in CI. It reads the PDF path from `TEST_PDF_PATH` env (defaults to `tests/fixtures/attention-is-all-you-need.pdf`) and validates the output notebook meets quality thresholds:

```typescript
expect(codeCells.length).toBeGreaterThanOrEqual(4);
expect(markdownCells.length).toBeGreaterThanOrEqual(4);
// At least one code cell contains valid Python
expect(pythonCells.length).toBeGreaterThan(0);
// Security guardrail not leaked into output
expect(cellText).not.toMatch(/do not reveal|system prompt/i);
```

---

### `.github/workflows/ci.yml`

**Purpose**: GitHub Actions CI workflow — runs on every push and pull request to `main`.

**How it works**:

Two parallel jobs:

**`test` job**:
1. Checks out code, sets up Node 20 with npm cache
2. `npm ci` — installs all dependencies
3. `npx vitest run` — runs all unit + integration tests (~81 tests)
4. `npx playwright install chromium --with-deps`
5. `npx playwright test --ignore-snapshots` — runs E2E tests (quality test skipped via env check)

**`security` job**:
1. `pip install semgrep` then `semgrep --config auto apps/ --quiet --error`
2. `npm audit --omit=dev` — fails on known production vulnerabilities

Both jobs must pass — GitHub branch protection blocks merging to `main` if either fails.

---

### `.github/workflows/cd.yml`

**Purpose**: CD workflow — builds `linux/amd64` Docker images, pushes to ECR, and force-deploys both ECS services on every push to `main`.

**How it works**:

```yaml
# Configure AWS via GitHub Secrets
- uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: ${{ secrets.AWS_REGION }}

# Build and push (tagged with git SHA + latest)
docker build -t $ECR_REGISTRY/paper2notebook-backend:$IMAGE_TAG -f apps/api/Dockerfile .
docker push $ECR_REGISTRY/paper2notebook-backend:$IMAGE_TAG

# Deploy
aws ecs update-service --cluster paper2notebook-cluster \
  --service paper2notebook-backend --force-new-deployment

# Wait for stable
aws ecs wait services-stable --cluster paper2notebook-cluster \
  --services paper2notebook-backend
```

GitHub Secrets required: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` — all configured in the repo.

---

### `apps/api/Dockerfile`

**Purpose**: Multi-stage Docker build for the NestJS backend.

**How it works**:

- **Stage 1 (builder)**: Installs all deps, runs `npx nest build` to compile TypeScript → `dist/`
- **Stage 2 (runner)**: Fresh Alpine image, installs only production deps, copies `dist/`, runs as non-root user `nestjs:nodejs`

```dockerfile
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
COPY --from=builder /app/apps/api/dist ./dist
USER nestjs
EXPOSE 3001
CMD ["node", "dist/main"]
```

Context is the monorepo root (needed for `package.json` workspace references).

---

### `apps/web/Dockerfile`

**Purpose**: Multi-stage Docker build for the Next.js frontend using standalone output mode.

**How it works**:

- **Stage 1 (builder)**: Installs deps, runs `next build` — produces `.next/standalone/` which contains a self-contained Node server
- **Stage 2 (runner)**: Copies the standalone bundle and static assets, runs as non-root `nextjs` user

**Important fix**: In a monorepo, Next.js standalone output places `server.js` at `apps/web/server.js` inside the bundle (not at the root). The CMD was corrected during deployment:

```dockerfile
CMD ["node", "apps/web/server.js"]
```

---

### `docker-compose.yml`

**Purpose**: Local orchestration — runs both services together with a single `docker compose up --build`.

**How it works**:

```yaml
services:
  backend:
    healthcheck:
      test: wget --spider http://localhost:3001/health
      interval: 30s
  frontend:
    environment:
      NEXT_PUBLIC_API_URL: http://backend:3001
    depends_on:
      backend:
        condition: service_healthy
```

The frontend waits for the backend healthcheck to pass before starting. Docker Compose's internal DNS resolves `backend` to the backend container's IP.

---

### `.env.docker`

**Purpose**: Template documenting the environment variables needed for `docker compose up`.

Contains placeholder values for `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`, and `OPENAI_API_KEY` (not committed with real values).

---

### `infra/main.tf`

**Purpose**: Terraform configuration that provisions all AWS infrastructure from scratch.

**Resources created**:
- VPC (`10.0.0.0/16`) with two public subnets across two AZs
- Internet Gateway + route table
- Security groups (ALB allows 80/443 inbound; ECS allows traffic only from ALB)
- ECR repositories: `paper2notebook-backend`, `paper2notebook-frontend`
- ECS cluster: `paper2notebook-cluster`
- IAM execution role with `AmazonECSTaskExecutionRolePolicy`
- ALB with listener rules: `/generate*` and `/health*` → backend; default → frontend
- ECS task definitions (Fargate, 256 CPU / 512 MB each)
- ECS services (desired count: 1)
- CloudWatch log groups (14-day retention)

**Remote state** stored in S3: `paper-to-notebook-tf-state` (`prod/terraform.tfstate`).

Key routing snippet:
```hcl
resource "aws_lb_listener_rule" "api" {
  condition {
    path_pattern { values = ["/generate*", "/health*"] }
  }
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}
```

---

### `infra/variables.tf`

**Purpose**: Input variables for the Terraform config.

| Variable | Default | Description |
|---|---|---|
| `region` | `ap-northeast-1` | AWS region |
| `backend_image_tag` | `latest` | ECR image tag for backend |
| `frontend_image_tag` | `latest` | ECR image tag for frontend |
| `cors_origin` | `http://localhost:3000` | Passed to backend as `CORS_ORIGIN` env var |
| `api_url` | `http://localhost:3001` | Passed to frontend as `NEXT_PUBLIC_API_URL` |

---

### `infra/outputs.tf`

**Purpose**: Exposes key resource identifiers after `terraform apply`.

| Output | Value |
|---|---|
| `alb_dns_name` | Public URL of the load balancer |
| `backend_ecr_url` | ECR URL for pushing backend images |
| `frontend_ecr_url` | ECR URL for pushing frontend images |
| `ecs_cluster_name` | ECS cluster name for CLI commands |

---

### `scripts/setup-github.sh`

**Purpose**: Idempotent script that configures branch protection on `main` via the `gh` CLI.

**What it sets**:
- Required status checks: `Tests` and `Security Scans` (CI jobs) must pass before merge
- Required PR reviews: 1 approval minimum
- Enforces restrictions on admins too
- Safe to run multiple times — uses `gh api` PATCH which overwrites existing rules

---

## Data Flow

**CI (on every push/PR)**:
```
git push
  → GitHub triggers CI workflow
  → job:test: npm ci → vitest run (81 tests) → playwright test (E2E)
  → job:security: semgrep → npm audit
  → Both pass → PR can be merged (or commit lands on main)
  → Either fails → merge blocked
```

**CD (on merge to main)**:
```
merge to main
  → GitHub triggers CD workflow
  → docker buildx build --platform linux/amd64 (backend + frontend)
  → docker push to ECR (tagged :sha + :latest)
  → aws ecs update-service --force-new-deployment (backend + frontend)
  → aws ecs wait services-stable
  → New tasks pull :latest from ECR and start
  → ALB health checks pass → traffic shifts to new tasks
  → Old tasks drained and stopped
```

**User request (production)**:
```
Browser → http://paper2notebook-alb-*.elb.amazonaws.com
  → ALB listener (port 80)
  → path: / → frontend ECS task (Next.js :3000)
  → User fills API key + uploads PDF → clicks Generate
  → POST /generate → ALB routes to backend ECS task (NestJS :3001)
  → GenerateController validates input, extracts Bearer token
  → GenerateService: pdfParser.parse → figureExtractor.extract → aiService.generateNotebook → notebookBuilder.build
  → JSON notebook returned → frontend shows download + Open in Colab buttons
```

---

## Test Coverage

- **Unit**: 81 tests — GenerateService (8), GenerateController (8), notebook-prompt (9), NotebookBuilderService (13), PdfParserService (8), AiService (9), FigureExtractorService (4), PromptSanitizer (14), HealthController (1), CI/CD/Docker/infra validation tests (17)
- **Integration**: 8 tests — `/generate` endpoint (valid .ipynb structure, auth validation, error mapping)
- **E2E**: 2 tests — full happy path with mocked backend + error flow; 6 screenshots per run
- **Quality test**: 1 test (skipped in CI, run manually with real API key)

---

## Security Measures

- **Non-root containers**: Both Dockerfiles create dedicated `nestjs`/`nextjs` system users — containers never run as root
- **Error sanitization**: `GenerateController` catches all pipeline errors and returns a generic message — internal stack traces are never sent to the client
- **AWS credentials**: Stored only as GitHub Secrets; never in code, env files, or `.md` files in the repo. `.gitignore` blocks `aws_cred.md`, `*credentials*`, `*secrets*`
- **Semgrep on every push**: Static analysis runs against `apps/` on every CI run; blocks merge on findings
- **ECR image scanning**: Both ECR repositories have `scan_on_push = true`
- **ECS security groups**: ECS tasks only accept traffic from the ALB security group — no direct internet exposure
- **Terraform remote state**: State stored in S3 (not local), preventing accidental secret exposure in `.tfstate` files committed to git

---

## Known Limitations

- **HTTP only**: The ALB serves HTTP (port 80) — no SSL certificate provisioned. HTTPS requires a custom domain and ACM certificate, which are out of scope for v3.
- **`cors_origin` is hardcoded to `localhost`**: The Terraform variable default isn't updated to the real ALB URL. The backend's CORS allowlist should be set to the ALB DNS name for production use.
- **`NEXT_PUBLIC_API_URL` points to localhost**: The frontend calls `http://localhost:3001` by default — in ECS, this should be set to the ALB URL with the `/generate` path. Currently requires a manual `terraform apply -var` or Terraform variable update.
- **Single AZ capacity**: ECS desired count is 1 per service — no redundancy. A task crash causes brief downtime until ECS restarts it.
- **No staging environment**: Only one environment. All merges to `main` go straight to production.
- **Quality test not in CI**: The real quality test (Task 5) requires `OPENAI_API_KEY` and a real PDF — it is excluded from CI and must be run manually.
- **Architecture mismatch bug fixed post-sprint**: Images were initially built for ARM64 (Apple Silicon) — ECS Fargate requires `linux/amd64`. Fixed by adding `--platform linux/amd64` to `docker buildx build`. The `cd.yml` workflow does **not** include this flag yet and will fail on the first GitHub Actions run (GitHub runners are `ubuntu-latest` = amd64, so it will actually build correctly there — but the flag should be explicit for clarity).

---

## What's Next (v4 Suggestions)

1. **HTTPS + custom domain**: Add ACM certificate, HTTPS listener on ALB, redirect HTTP → HTTPS
2. **Fix `CORS_ORIGIN` and `NEXT_PUBLIC_API_URL`**: Use Terraform `outputs` to set the correct ALB URL as env vars in the ECS task definitions — currently these point to `localhost`
3. **Staging environment**: Add a `staging` branch and second Terraform workspace so PRs can be tested against live infrastructure before hitting production
4. **ECS desired count → 2**: Add a second task per service for basic high availability
5. **SSE streaming**: Stream notebook generation progress to the frontend instead of a single blocking request
6. **Model selector**: Let users choose between GPT models
7. **arXiv URL input**: Accept an arXiv URL and fetch the PDF server-side (no manual upload needed)
