# Sprint v4 — Walkthrough

## Summary

Sprint v4 transformed Paper2Notebook from a functional but unstyled tool into a polished, professional-looking web application. The sprint introduced a complete CSS design-token system, seven keyframe animations, glass-morphism card surfaces, and full visual redesigns of every UI component — all without breaking a single existing `data-testid` selector. 78 Playwright tests and 146 vitest unit tests pass green.

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────┐
│  Browser                                                  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  layout.tsx  (Inter font, dark body base)           │  │
│  │  ┌───────────────────────────────────────────────┐  │  │
│  │  │  page.tsx  (dot-grid, spotlight, orchestrator)│  │  │
│  │  │                                               │  │  │
│  │  │  <Header />  sticky 56px top bar              │  │  │
│  │  │                                               │  │  │
│  │  │  <main>                                       │  │  │
│  │  │    hero block  (fadeUp animation)             │  │  │
│  │  │    ┌─ form card (glass, fadeUp-delay) ──────┐ │  │  │
│  │  │    │  step-label · <ApiKeyInput />           │ │  │  │
│  │  │    │  ── step-divider ──────────────────     │ │  │  │
│  │  │    │  step-label · <PdfUpload />             │ │  │  │
│  │  │    │  ── step-divider ──────────────────     │ │  │  │
│  │  │    │  step-label · <GenerateButton />        │ │  │  │
│  │  │    │  [loading dots | error pill]            │ │  │  │
│  │  │    └────────────────────────────────────────┘ │  │  │
│  │  │    <ResultPanel />  (slideUp, success glow)   │  │  │
│  │  │  </main>                                      │  │  │
│  │  │                                               │  │  │
│  │  │  <Footer />                                   │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  globals.css — design tokens + keyframes + utilities      │
│  ApiKeyContext — apiKey state shared across components    │
└───────────────────────────────────────────────────────────┘
                          │
                          │ POST /generate  (FormData + Bearer token)
                          ▼
                   FastAPI backend (unchanged)
```

---

## Files Created/Modified

### `apps/web/app/globals.css`

**Purpose**: The single source of truth for the entire visual design system — tokens, keyframes, and reusable utility classes.

**Key sections**:
- `:root` — 20+ CSS custom properties covering colors, typography scale, spacing, border radius, and shadow values
- `@keyframes` — 7 named animations
- Utility classes — `.dot-grid::before`, `.glass-card`, `.btn-shimmer`, `.step-label`, `.step-divider`, `.animate-*`

**How it works**:

The design system starts with a dark palette anchored at `#0a0a0f` (near-black base) and builds up through progressively lighter surface colors (`--color-bg-surface: #13131a`, `--color-bg-elevated: #1c1c28`). Every interactive element draws from a single indigo accent (`--color-accent: #6366f1`) with lighter and glow variants for hover states.

```css
:root {
  --color-bg-base: #0a0a0f;
  --color-bg-surface: #13131a;
  --color-accent: #6366f1;
  --color-accent-glow: rgba(99, 102, 241, 0.15);
  --color-success: #10b981;
  --color-error: #f87171;
  --color-colab: #f9ab00;   /* Google Colab brand orange */
}
```

The dot-grid background is a CSS pseudo-element trick — the `.dot-grid` wrapper gains a `::before` pseudo-element that renders a fixed radial-gradient pattern at 28×28px spacing. It sits at `z-index: 0` with `pointer-events: none` so it never intercepts clicks.

The shimmer button effect uses a purely CSS-triggered mechanism. A `<span class="btn-shimmer">` sits absolutely positioned inside the button. At rest, it's translated off-screen to the left. When the parent `.generate-btn` is hovered, the CSS rule `.generate-btn:hover .btn-shimmer` fires the `shimmer` keyframe which slides it through the button. This approach avoids JavaScript event listeners for a pure-CSS hover animation.

```css
.btn-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%);
  transform: translateX(-100%);
}
.generate-btn:hover .btn-shimmer {
  animation: shimmer 0.65s ease-out forwards;
}
```

The `bounceDot` keyframe is designed to be used with per-element `animation-delay` set inline. The opacity drops to 0.4 at rest, spikes to 1 at the apex, giving each dot a "breathing" quality beyond the simple vertical bounce.

---

### `apps/web/app/layout.tsx`

**Purpose**: Next.js root layout — loads the Inter typeface and applies the dark body background.

**How it works**:

Uses `next/font/google` to load Inter with `variable: "--font-sans"` and `display: "swap"`. The `<body>` receives Inter's className and an inline `backgroundColor: var(--color-bg-base)` to prevent any flash of white before the CSS loads.

Note: The PRD originally specified the Geist font (listed in Next.js docs as bundled), but Geist requires installing the separate `geist` npm package which was not in the project. Inter was substituted — it is visually comparable and zero additional dependencies.

---

### `apps/web/app/page.tsx`

**Purpose**: Page orchestrator — renders the full-page layout, manages form state, and coordinates all child components.

**Key state**:
- `apiKey` — from `ApiKeyContext` (shared with `ApiKeyInput`)
- `pdfFile` — the selected `File` object
- `isLoading` / `notebook` / `error` — generation lifecycle

**How it works**:

The page uses two layered backgrounds. The outer `.dot-grid` div provides the fixed dot-grid texture via its `::before` pseudo-element. Inside, an absolutely positioned "spotlight" div renders a `radial-gradient` ellipse centered behind the form card, animated with the `spotlight` keyframe that pulses its opacity between 0.6 and 0.9.

```tsx
<div
  data-testid="hero-spotlight"
  style={{
    position: "absolute",
    top: "30%", left: "50%",
    transform: "translate(-50%, -50%)",
    width: "800px", height: "600px",
    background: "radial-gradient(ellipse at center, var(--color-accent-glow) 0%, transparent 70%)",
    animation: "spotlight 4s ease-in-out infinite",
  }}
/>
```

The hero text block and the form card each get staggered `fadeUp` animations — `animate-fade-up` for the hero (0s delay) and `animate-fade-up-delay` for the card (0.15s delay) — so the page feels like it "opens up" from the top.

The form card contains three step sections separated by `<hr class="step-divider">` elements. Each section has a small `.step-label` above its control (e.g., "1 · API KEY") to guide the user through the three-step flow.

The loading state renders three bouncing dots with staggered `animation-delay` values:

```tsx
{[0, 1, 2].map((i) => (
  <span
    key={i}
    data-testid="loading-dot"
    className="animate-bounce-dot"
    style={{ animationDelay: `${i * 0.15}s` }}
  />
))}
```

The error state renders a red pill badge with the `animate-shake` class applied — so on each new error the element "shakes" once from left to right.

---

### `apps/web/app/components/Header.tsx`

**Purpose**: Sticky branded top bar with logo, product name, and GitHub link.

**Key elements**:
- `data-testid="site-header"` — the root `<header>` element
- `data-testid="header-brand-title"` — "Paper2Notebook" text
- `data-testid="header-github-link"` — anchor pointing to GitHub

**How it works**:

The header is `position: sticky; top: 0; z-index: 50` with `backdrop-filter: blur(12px)` so it floats over the dot-grid background as the user scrolls. The logo mark is an inline SVG — a simplified "document with arrow" shape drawn in the indigo accent color, requiring no external assets.

The GitHub link includes `rel="noopener noreferrer"` (important for security when using `target="_blank"`) and implements hover state via React `onMouseEnter`/`onMouseLeave` that toggle the icon's color between muted and primary.

---

### `apps/web/app/components/Footer.tsx`

**Purpose**: Minimal branded footer with a single attribution line.

**How it works**:

A simple `<footer>` with a top border (`1px solid var(--color-border)`) and centered muted text. Renders "Built with Paper2Notebook · v4". Intentionally minimal — its job is to close the page visually without competing with the main form.

---

### `apps/web/app/components/ApiKeyInput.tsx`

**Purpose**: Password input for the OpenAI API key, with lock icon, eye-toggle reveal, and filled indicator.

**Key testids**: `api-key-input`, `api-key-lock-icon`, `api-key-eye-toggle`, `api-key-indicator`

**How it works**:

Three local boolean states drive the visual presentation:
- `showKey` — toggles the input `type` between `password` and `text`, and swaps `EyeOffIcon` ↔ `EyeIcon`
- `isFocused` — applies a focus ring via box-shadow (`--shadow-accent`) and changes the border color to `--color-border-focus`
- `isFilled` (derived from `apiKey.length > 0`) — swaps the lock icon to the indigo accent color and shows a green checkmark pill badge

```tsx
// Focus ring applied inline when focused
style={{
  border: `1px solid ${isFocused ? "var(--color-border-focus)" : "var(--color-border)"}`,
  boxShadow: isFocused ? "var(--shadow-accent)" : "none",
}}
```

The `autoComplete="off"` attribute is set on the input to prevent browsers from autofilling API keys, which could expose them in password managers in unexpected ways.

---

### `apps/web/app/components/PdfUpload.tsx`

**Purpose**: Drag-and-drop PDF upload zone with animated states for empty, drag-over, file-selected, and error.

**Key testids**: `pdf-dropzone`, `pdf-file-input`, `pdf-upload-icon`, `pdf-upload-helper`, `pdf-file-icon`, `pdf-file-name`, `pdf-file-size`, `pdf-error`

**How it works**:

The component has four distinct visual states, each driven by local state:

1. **Empty**: `CloudUploadIcon` (40px SVG) above helper text
2. **Drag-over** (`isDragOver: true`): background switches to `--color-accent-glow`, border changes to `--color-accent` with `pulse-border` animation playing, text changes to accent color
3. **File selected**: The cloud icon is replaced by a `DocumentIcon` with the filename (truncated with `text-overflow: ellipsis`) and human-readable file size
4. **Error**: Red pill with `animate-shake` class on mount

```tsx
// Drag-over state styling
style={{
  backgroundColor: isDragOver ? "var(--color-accent-glow)" : "transparent",
  borderColor: isDragOver ? "var(--color-accent)" : "var(--color-border)",
  animation: isDragOver ? "pulse-border 1s ease-in-out infinite" : "none",
}}
```

The hidden `<input type="file" accept=".pdf">` is given `data-testid="pdf-file-input"` so Playwright can call `.setInputFiles()` on it — this is the standard pattern for testing file uploads without needing real drag events.

---

### `apps/web/app/components/GenerateButton.tsx`

**Purpose**: The primary CTA — indigo-to-violet gradient when enabled, muted when disabled, shimmer sweep on hover.

**Key testid**: `generate-button`

**How it works**:

The button has two appearance modes separated by the `disabled` prop. When disabled, it gets a flat `--color-bg-elevated` background with muted text and `cursor: not-allowed`. When enabled it gets the gradient background and the `.generate-btn` CSS class that enables the shimmer hover selector.

```tsx
<button
  className={disabled ? "" : "generate-btn"}
  style={{
    backgroundImage: disabled
      ? "none"
      : "linear-gradient(135deg, var(--color-accent) 0%, #7c3aed 100%)",
    backgroundColor: disabled ? "var(--color-bg-elevated)" : undefined,
    height: "48px",
    position: "relative",
    overflow: "hidden",
  }}
>
  {!disabled && <span className="btn-shimmer" aria-hidden="true" />}
  Generate Notebook
</button>
```

The `overflow: hidden` on the button is critical — it clips the shimmer span so the white streak doesn't spill outside the button's rounded corners during animation.

---

### `apps/web/app/components/ResultPanel.tsx`

**Purpose**: Success card that appears after generation — displays a checkmark, "Notebook ready!" heading, and two action buttons.

**Key testids**: `result-panel`, `result-check-icon`, `result-heading`, `download-button`, `open-colab-button`

**How it works**:

The panel has an emerald-green success aesthetic to contrast with the default indigo accent — this signals a distinct "done" state. The border is `rgba(16,185,129,0.2)` (emerald with 20% opacity) and the box-shadow includes a success-glow.

The `.animate-slide-up` class means the panel slides in from 24px below with a fade when it first mounts — Playwright tests verify this by checking the class is present on the DOM element.

The two action buttons use deliberately different visual treatments:
- **Download**: solid indigo gradient (same as the Generate button) — primary action
- **Open in Colab**: transparent background with Google Colab orange (`#f9ab00`) border and text — secondary action with brand recognition

Both implement hover lift via `onMouseEnter`/`onMouseLeave` toggling `translateY(-1px)` and an enhanced box-shadow.

---

## Data Flow

```
User types API key
  → ApiKeyContext.setApiKey()
  → apiKey state shared to page.tsx

User drops/selects PDF
  → PdfUpload.onFileSelect(file)
  → page.tsx setPdfFile(file)
  → canGenerate = apiKey.length > 0 && pdfFile !== null
  → GenerateButton disabled prop updates

User clicks Generate
  → page.tsx handleGenerate()
  → setIsLoading(true) → 3 bouncing dots render
  → FormData { pdf: File }
  → POST /generate  (Authorization: Bearer <apiKey>)
  → await res.json()
      ├── Success → setNotebook(data) → <ResultPanel notebook={data} /> renders with slideUp
      └── Error   → setError(msg)    → red pill badge with shake animation renders
```

---

## Test Coverage

| Suite | File | Tests | What it verifies |
|---|---|---|---|
| E2E | `design-system.spec.ts` | 4 | CSS vars present, font class applied, dark bg, keyframes exist |
| E2E | `hero-scaffold.spec.ts` | 6 | dot-grid class, spotlight testid, hero text visible, animation classes |
| E2E | `header-footer.spec.ts` | 7 | Header visibility, GitHub link, logo mark, footer text, sticky position |
| E2E | `api-key-redesign.spec.ts` | 8 | Lock icon, eye toggle, reveal/hide, filled indicator pill |
| E2E | `pdf-upload-redesign.spec.ts` | 6 | Cloud icon, helper text, file pill on upload, error shake class |
| E2E | `generate-button-redesign.spec.ts` | 6 | Gradient background, 48px height, overflow:hidden, relative position |
| E2E | `loading-error-redesign.spec.ts` | 6 | 3 dots visible, loading label, animate-bounce-dot class, error pill |
| E2E | `result-panel-redesign.spec.ts` | 7 | Slide-up class, check icon, heading text, button backgrounds |
| E2E | `form-card-steps.spec.ts` | 7 | Backdrop-filter blur, 3 step labels, 2+ dividers, step-label CSS class |
| E2E | `sprint-v4-smoke.spec.ts` | 7 | Complete redesigned flow end-to-end with task10-* screenshots |
| E2E | `full-flow.spec.ts` | 2 | Full happy path + error path (unchanged from v3, screenshots renamed) |
| Unit | `tests/unit/` | 146 | Business logic, colab URL generation, notebook serialization (unchanged) |

**Total: 78 Playwright E2E + 146 vitest unit = 224 tests, all green**

---

## Security Measures

- **`autoComplete="off"`** on the API key input — prevents password manager autofill of sensitive API keys
- **`rel="noopener noreferrer"`** on the GitHub `target="_blank"` link — prevents tab-napping attacks where the opened page could manipulate `window.opener`
- **`aria-hidden="true"`** on all decorative SVG icons — keeps screen reader output clean
- **`pointer-events: none`** on the dot-grid pseudo-element and spotlight div — prevents invisible elements from intercepting user interactions
- API key is transmitted only via `Authorization: Bearer` header (never in the URL or form body)
- `npm audit --omit=dev` was run after every task — zero production vulnerabilities found

---

## Known Limitations

1. **No dark/light mode toggle** — the design is dark-only; a `prefers-color-scheme: light` media query override was not added
2. **Hover lift requires JavaScript** — the `translateY(-1px)` hover effect on buttons uses `onMouseEnter`/`onMouseLeave` React handlers rather than CSS `:hover`. This works fine but means the lift effect won't apply if JS fails to hydrate
3. **Shimmer only fires on hover, not on focus** — keyboard users tabbing to the Generate button won't see the shimmer animation. A `:focus-visible` variant should be added in v5
4. **Inter font instead of Geist** — the PRD specified Geist (listed as bundled in Next.js docs) but it actually requires installing the separate `geist` npm package. Inter is used instead — visually similar but technically a deviation from spec
5. **No mobile-specific breakpoints** — layout uses `clamp()` for font sizing and `maxWidth` for the form card, but no explicit responsive adjustments were made for very small screens
6. **Animations use `both` fill mode** — `animation-fill-mode: both` means elements are invisible until their animation starts. On slow connections where CSS loads after HTML, this could briefly show invisible content

---

## What's Next (v5 Suggestions)

Based on the current state and natural progression:

1. **Keyboard & accessibility polish** — Add `:focus-visible` rings, ensure all interactive elements are reachable without a mouse, add `role` and `aria-label` where missing
2. **Mobile responsive layout** — Stack the form card sections differently on narrow viewports; increase tap target sizes
3. **Dark/light mode** — Add a toggle that switches between the current dark palette and a light counterpart using the same CSS token system
4. **Drag-and-drop visual refinement** — The drag-over state triggers a border animation, but the dropzone doesn't scale up or show a "drop here" overlay message large enough for a first-time user
5. **Streaming generation** — Replace the three-dot loading state with actual progress feedback (e.g., "Parsing PDF… → Generating cells… → Formatting notebook…") using a Server-Sent Events or WebSocket endpoint on the backend
6. **Toast notification system** — Replace the inline red error pill with a global toast that auto-dismisses, allowing the user to retry without visually cluttered state
7. **History / recent notebooks** — Persist generated notebooks in `localStorage` and show a "Recent" panel below the form card
