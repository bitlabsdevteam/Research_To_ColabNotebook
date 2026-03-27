# Sprint v3 — Production Readiness: Testing, CI/CD & Cloud Deployment

## Sprint Overview

Make Paper2Notebook production-ready with comprehensive test coverage following the testing pyramid (~70% unit, ~20% integration, ~10% E2E), a GitHub Actions CI/CD pipeline that gates all merges on passing tests and security scans, and containerized deployment to AWS ECS Fargate via Terraform. This sprint takes the security-hardened v2 codebase and makes it deployable, testable, and maintainable.

## Goals

- **G1**: Achieve full test coverage across all backend modules — every service, controller, and utility has dedicated unit tests
- **G2**: E2E Playwright tests cover the complete user flow with screenshots at each step
- **G3**: A real quality test validates notebook output from "Attention Is All You Need" in a visible browser
- **G4**: GitHub Actions CI runs all tests, semgrep, and npm audit on every push/PR — merges blocked if any check fails
- **G5**: Docker containers for both services, orchestrated via docker-compose, deployed to AWS ECS Fargate with Terraform
- **G6**: CD pipeline auto-deploys to AWS after tests pass on main

## User Stories

1. **As a** developer, **I want** comprehensive unit tests for every backend module, **so that** I can refactor with confidence and catch regressions early.
2. **As a** developer, **I want** E2E tests that screenshot each step of the user flow, **so that** I can visually debug UI issues.
3. **As a** product owner, **I want** a real quality test that generates a notebook from a known paper, **so that** I can validate the output meets quality standards.
4. **As a** developer, **I want** CI that blocks broken code from merging, **so that** main branch is always deployable.
5. **As a** deployer, **I want** Docker containers and Terraform config, **so that** I can deploy to AWS with a single merge to main.

## Technical Architecture

### Current Stack (unchanged from v2)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS 4 |
| Backend | NestJS 11, TypeScript 5.8 |
| AI | OpenAI GPT-5.4 |
| PDF | pdfjs-dist 4.10 |
| Testing | Vitest 3.x (unit/integration), Playwright 1.58 (E2E) |
| Monorepo | Turborepo 2.4 |

### New Infrastructure

| Component | Technology |
|-----------|-----------|
| CI/CD | GitHub Actions |
| Security scan | semgrep (auto config) |
| Dependency audit | npm audit |
| Container | Docker (multi-stage builds) |
| Orchestration | docker-compose |
| Cloud | AWS ECS Fargate |
| IaC | Terraform |
| State | S3 bucket (Terraform remote state) |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                         │
│                                                                  │
│  push/PR ──► GitHub Actions CI                                   │
│              ├── npm run test (vitest — unit + integration)      │
│              ├── npx playwright test (E2E)                       │
│              ├── semgrep --config auto                            │
│              ├── npm audit                                        │
│              └── ❌ Block merge if ANY fails                     │
│                                                                  │
│  merge to main ──► GitHub Actions CD                             │
│              ├── Build Docker images                              │
│              ├── Push to ECR                                      │
│              └── Deploy to ECS Fargate                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     AWS ECS Fargate Cluster                       │
│                                                                  │
│  ┌──────────────────────┐    ┌──────────────────────────────┐   │
│  │  Frontend Service     │    │  Backend Service              │   │
│  │  Next.js + nginx      │    │  NestJS                       │   │
│  │  Port 80 (ALB)        │◄──►│  Port 3001 (internal)        │   │
│  └──────────────────────┘    └──────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Application Load Balancer                                │   │
│  │  HTTPS:443 → Frontend:80                                  │   │
│  │  /api/* → Backend:3001                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Docker Compose (local dev)                    │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐                           │
│  │  frontend     │    │  backend      │                           │
│  │  :3000        │───►│  :3001        │                           │
│  └──────────────┘    └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

### Testing Pyramid

```
        ╱╲
       ╱  ╲        E2E (Playwright)
      ╱ 10%╲       Full browser flow + real quality test
     ╱──────╲
    ╱        ╲     Integration (Vitest)
   ╱   20%    ╲    API endpoints with mocked AI
  ╱────────────╲
 ╱              ╲  Unit (Vitest)
╱     70%        ╲ Every service, controller, utility
╱──────────────────╲
```

### Test Coverage Targets

| Module | Current Unit Tests | Target |
|--------|--------------------|--------|
| PdfParserService | 8 tests | 8 (sufficient) |
| AiService | 9 tests | 9 (sufficient) |
| NotebookBuilderService | 5 tests | 10+ (expand) |
| FigureExtractorService | 4 tests | 4 (sufficient) |
| PromptSanitizer | 14 tests | 14 (sufficient) |
| GenerateService | 0 tests | 6+ (NEW) |
| GenerateController | 0 tests | 6+ (NEW) |
| notebook-prompt.ts | 0 tests | 5+ (NEW) |
| HealthController | 1 test | 1 (sufficient) |
| **Integration** | 12 tests | 16+ |
| **E2E** | 3 tests | 6+ (expand with screenshots) |

### Credential Management

**AWS credentials** are stored ONLY as GitHub Secrets — never in the repository:
- `AWS_ACCESS_KEY_ID` — IAM user access key
- `AWS_SECRET_ACCESS_KEY` — IAM user secret key
- `AWS_REGION` — Deployment region (e.g., `us-east-1`)

The IAM user (`moden_soft_engineer`) has these policies:
- AmazonEC2FullAccess
- AmazonECS_FullAccess
- AmazonEC2ContainerRegistryFullAccess
- ElasticLoadBalancingFullAccess
- IAMFullAccess
- CloudWatchLogsFullAccess
- AmazonS3FullAccess (for Terraform state)

Terraform remote state is stored in an S3 bucket (e.g., `paper-to-notebook-tf-state-XXXX`).

## Out of Scope (v3)

- SSE/streaming generation progress
- Model selector (GPT model choice)
- User authentication / accounts
- arXiv URL input (PDF upload only)
- Batch PDF processing
- Paper history / saved notebooks
- Custom domain / SSL certificate provisioning
- Multi-environment (staging/production) — single environment only
- Database / persistent storage

## Dependencies

- Sprint v2 complete (all 10 security tasks done)
- GitHub repository exists and is accessible via `gh` CLI
- AWS IAM user created with required policies
- AWS credentials stored as GitHub Secrets
- S3 bucket created for Terraform state
- Docker installed locally for container testing
- Terraform CLI installed locally
