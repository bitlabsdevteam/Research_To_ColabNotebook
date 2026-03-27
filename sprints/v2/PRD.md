# Sprint v2 — Security Hardening & Production Readiness

## Sprint Overview

Harden the Paper2Notebook application against the 7 security findings identified in the v1 audit. The critical prompt injection vector is addressed first, followed by infrastructure-level protections (rate limiting, security headers, error sanitization), API key handling improvements, AI response validation, and PDF parser memory safeguards. Two feature improvements are included: PDF figure extraction (deferred from v1) and `.gitignore` hygiene.

## Goals

- **G1**: Mitigate prompt injection risk — sanitize PDF text before sending to GPT, add guardrail system instructions, validate generated code cells
- **G2**: Add infrastructure security — rate limiting via `@nestjs/throttler`, security headers via `helmet`
- **G3**: Move API key from request body to `Authorization` header to reduce logging/caching exposure
- **G4**: Sanitize error messages — log full details server-side, return generic messages to clients
- **G5**: Protect against PDF memory DoS — enforce page count limit and parsing timeout

## User Stories

1. **As a** user, **I want** the app to reject suspiciously crafted PDFs, **so that** I don't accidentally run malicious code in my Colab notebook.
2. **As a** deployer, **I want** rate limiting on the API, **so that** the server can't be overwhelmed by abusive traffic.
3. **As a** deployer, **I want** proper security headers on all responses, **so that** the app follows web security best practices.
4. **As a** user, **I want** my API key sent in a header instead of the form body, **so that** it's less likely to be logged by intermediaries.
5. **As a** user, **I want** error messages that don't leak internal details, **so that** attackers can't learn about the system from error responses.
6. **As a** user, **I want** the app to handle huge PDFs gracefully, **so that** a 500-page document doesn't crash the server.

## Technical Architecture

### New Dependencies

| Package | Purpose |
|---------|---------|
| `helmet` | Security headers middleware |
| `@nestjs/throttler` | Rate limiting decorator/module |

### Component Changes

```
┌─────────────────────────────────────────────────────────────────┐
│                  NestJS 11 Backend API (:3001)                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  NEW: helmet() middleware — security headers on all res   │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  NEW: ThrottlerModule — 10 req/min per IP globally        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CHANGED: GenerateController                              │   │
│  │  - API key from Authorization header (not body)           │   │
│  │  - Generic error responses (details logged server-side)   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CHANGED: PdfParserService                                │   │
│  │  - Page count limit (max 100 pages)                       │   │
│  │  - Parsing timeout (30s)                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  NEW: PromptSanitizer                                     │   │
│  │  - Strips instruction-like patterns from PDF text         │   │
│  │  - Adds injection guardrail to system prompt              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CHANGED: AiService                                       │   │
│  │  - Validates cell_type field on each returned cell        │   │
│  │  - Sanitized error messages                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  NEW: FigureExtractorService (deferred from v1 Task 6)   │   │
│  │  - Extracts embedded images from PDF as base64 PNG        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Next.js 15 Frontend (:3000)                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CHANGED: page.tsx                                        │   │
│  │  - Sends API key in Authorization header, not FormData    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Changes

```
BEFORE (v1):
  FormData: { pdf: File, apiKey: "sk-..." }  →  POST /generate

AFTER (v2):
  Headers: { Authorization: "Bearer sk-..." }
  FormData: { pdf: File }                    →  POST /generate
```

## Out of Scope (v2)

- SSE/streaming generation progress
- Model selector (GPT model choice from frontend)
- User authentication / accounts
- HTTPS enforcement (deployer responsibility)
- GitHub Gist integration for Colab
- Batch PDF processing
- Paper history / saved notebooks

## Dependencies

- Sprint v1 complete (all P0 tasks done)
- `helmet` npm package
- `@nestjs/throttler` npm package
