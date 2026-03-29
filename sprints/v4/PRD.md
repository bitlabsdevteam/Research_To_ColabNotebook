# Sprint v4 — Elegant Professional UI Redesign

## Sprint Overview

Transform Paper2Notebook's functional-but-plain UI into a polished, professional web experience. This sprint replaces the basic gray Tailwind layout with a cohesive design system — premium typography, a rich color palette, smooth micro-animations, elevated component styling, and a hero-style page layout — without changing any backend logic or breaking existing `data-testid` selectors used by E2E tests.

## Goals

- **G1**: Establish a design system with CSS custom properties (color tokens, spacing scale, typography) using the Geist font family already bundled with Next.js
- **G2**: Replace the plain `bg-gray-50` layout with a full-screen hero experience — dark gradient background, radial spotlight, subtle grid texture
- **G3**: Redesign all four components (ApiKeyInput, PdfUpload, GenerateButton, ResultPanel) with glass-morphism cards, hover effects, and smooth CSS transitions
- **G4**: Add meaningful animations: staggered fade-in on page load, drag-state pulse on the dropzone, shimmer on the generate button, and a success reveal on the result panel
- **G5**: Add a minimal branded header and footer; preserve all `data-testid` attributes so existing Playwright E2E tests pass unchanged

## User Stories

1. **As a** first-time visitor, **I want** a visually impressive landing page, **so that** I immediately trust that this is a professional tool.
2. **As a** user filling in the form, **I want** clear visual feedback on each input state (focus, filled, error), **so that** I always know where I am in the flow.
3. **As a** user waiting for generation, **I want** a polished animated loading state, **so that** I feel the tool is working rather than frozen.
4. **As a** user who received a result, **I want** a satisfying success state with clear action buttons, **so that** downloading or opening in Colab feels rewarding.
5. **As a** developer, **I want** all existing E2E tests to continue passing, **so that** the redesign doesn't break functional correctness.

## Technical Architecture

### Stack (unchanged from v3)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS 4 |
| Font | Geist (built into Next.js — no extra package needed) |
| Animations | CSS keyframes + Tailwind transition utilities (no new JS animation library) |
| Icons | Inline SVGs (no icon library — keeps bundle lean) |

### Design System

```
CSS Custom Properties (globals.css)
─────────────────────────────────────────────────────
Color tokens:
  --color-bg-base        #0a0a0f   (near-black page background)
  --color-bg-surface     #13131a   (card background)
  --color-bg-elevated    #1c1c28   (input/hover surface)
  --color-border         rgba(255,255,255,0.08)
  --color-border-focus   rgba(99,102,241,0.6)    (indigo glow)
  --color-accent         #6366f1   (indigo-500)
  --color-accent-light   #818cf8   (indigo-400)
  --color-accent-glow    rgba(99,102,241,0.15)
  --color-success        #10b981   (emerald-500)
  --color-error          #f87171   (red-400)
  --color-text-primary   #f1f5f9
  --color-text-secondary #94a3b8
  --color-text-muted     #475569

Typography:
  Font: Geist Sans (Next.js built-in)
  --font-size-xs   0.75rem
  --font-size-sm   0.875rem
  --font-size-base 1rem
  --font-size-lg   1.125rem
  --font-size-xl   1.25rem
  --font-size-2xl  1.5rem
  --font-size-3xl  1.875rem
  --font-size-4xl  2.25rem
  --font-size-5xl  3rem
  --font-size-6xl  3.75rem

Spacing scale: 4px base unit (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96)

Border radius:
  --radius-sm   6px
  --radius-md   12px
  --radius-lg   16px
  --radius-xl   24px
  --radius-full 9999px
```

### Component Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  <Header>                                                         │
│  Logo mark  +  "Paper2Notebook"   [GitHub icon link]             │
│─────────────────────────────────────────────────────────────────│
│                                                                   │
│  ░░░░░░░░░░░░░░░░ HERO BACKGROUND ░░░░░░░░░░░░░░░░░░░░          │
│  (dark gradient + radial spotlight + subtle dot-grid texture)     │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  [HERO TEXT]                                              │   │
│  │  "Turn any research paper into a"                         │   │
│  │  "Colab tutorial — instantly."                            │   │
│  │  subtitle: "Paste your OpenAI key, drop a PDF, done."     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  [GLASS CARD — 480px max-width]                           │   │
│  │                                                           │   │
│  │  Step 1: ApiKeyInput (lock icon + eye toggle)             │   │
│  │  ─────────────────────────────────────────────           │   │
│  │  Step 2: PdfUpload (upload icon + animated drag state)   │   │
│  │  ─────────────────────────────────────────────           │   │
│  │  Step 3: GenerateButton (gradient, shimmer on hover)     │   │
│  │                                                           │   │
│  │  [loading state: animated progress dots + message]        │   │
│  │  [error state: red pill badge]                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  [RESULT PANEL — slides up on success]                    │   │
│  │  ✓ Notebook ready!                                        │   │
│  │  [Download .ipynb]   [Open in Colab →]                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│─────────────────────────────────────────────────────────────────│
│  <Footer> — "Built with Paper2Notebook · v4"                     │
└─────────────────────────────────────────────────────────────────┘
```

### Animation Inventory

| Element | Animation | Trigger |
|---------|-----------|---------|
| Page sections | Staggered fade-up (opacity 0→1, translateY 20px→0) | On mount |
| Glass card | Fade-in with subtle scale (0.97→1) | On mount, 150ms delay |
| PdfUpload dropzone | Border color pulse + bg glow | On drag-over |
| GenerateButton | Shimmer sweep left-to-right | On hover (enabled state) |
| Loading indicator | Three bouncing dots | While `isLoading` |
| ResultPanel | Slide-up + fade-in | When notebook becomes non-null |
| Error message | Shake + fade-in | On error set |

### Data-testid Preservation

All existing `data-testid` attributes remain unchanged:
`app-title`, `app-description`, `api-key-input`, `api-key-indicator`, `pdf-dropzone`, `pdf-file-input`, `pdf-file-name`, `pdf-file-size`, `pdf-error`, `generate-button`, `loading-indicator`, `error-message`, `result-panel`, `download-button`, `open-colab-button`

## Out of Scope (v4)

- Dark/light mode toggle (v4 is dark-only)
- Responsive mobile breakpoints beyond basic max-width centering
- Animation library (Framer Motion, GSAP) — CSS-only animations
- New backend features (streaming, model selector, arXiv URL)
- Any changes to backend code, tests, CI/CD, or Terraform

## Dependencies

- Sprint v3 complete (all tests passing, CI/CD operational)
- No new npm packages required (Geist font is built into Next.js 15; all animations via CSS)
- Existing `data-testid` selectors must be preserved for Playwright E2E tests
