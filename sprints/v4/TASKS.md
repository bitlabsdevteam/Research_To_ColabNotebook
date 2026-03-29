# Sprint v4 — Tasks

## Backlog

- [x] Task 1: Design system — CSS custom properties and global styles (P0)
  - Acceptance: `globals.css` defines all color tokens, typography scale, radius/spacing variables, keyframe animations (`fadeUp`, `shimmer`, `bounceDot`, `shake`), and a dark dot-grid background pattern; `layout.tsx` loads Geist font and applies `font-geist-sans` class to `<body>`
  - Files: `apps/web/app/globals.css`, `apps/web/app/layout.tsx`
  - Completed: 2026-03-28 — CSS custom properties, 7 keyframes (fadeUp/shimmer/bounceDot/shake/slideUp/pulse-border/spotlight), dot-grid texture, glass-card/step-label utility classes; layout.tsx uses Inter via next/font/google (Geist not bundled without extra package); 4 Playwright tests green

- [x] Task 2: Hero background and page scaffold (P0)
  - Acceptance: `page.tsx` renders a full-screen dark page with a radial gradient spotlight centered behind the card, a dot-grid texture overlay, staggered `fadeUp` animation on the hero text block and card (card delayed 150ms); page still passes Playwright smoke check (all data-testid elements present)
  - Files: `apps/web/app/page.tsx`
  - Completed: 2026-03-28 — Full-screen dark scaffold with dot-grid class, radial spotlight div, hero heading/subheading with animate-fade-up, form card with animate-fade-up-delay; all existing data-testid selectors preserved; 6 Playwright tests green

- [x] Task 3: Branded header and footer components (P0)
  - Acceptance: A new `<Header>` component renders a sticky top bar with the Paper2Notebook logo mark (SVG) and title on the left, and a GitHub icon link on the right, styled with `var(--color-bg-surface)` and a bottom border; a `<Footer>` renders a centered muted line at the bottom; both are wired into `page.tsx`
  - Files: `apps/web/app/components/Header.tsx`, `apps/web/app/components/Footer.tsx`, `apps/web/app/page.tsx`
  - Completed: 2026-03-28 — Header: sticky, 56px, logo mark SVG + brand title + GitHub icon link with hover states; Footer: border-top, "Built with Paper2Notebook · v4"; all existing tests pass; 7 Playwright tests green

- [x] Task 4: Redesign ApiKeyInput — polished dark input with lock icon and eye toggle (P0)
  - Acceptance: Input sits inside a glass card section; a lock SVG icon is shown on the left of the field; an eye/eye-off SVG toggle on the right switches `type` between `password` and `text`; focus state shows `var(--color-border-focus)` ring; filled state shows a green checkmark badge instead of plain "Key set" text; all `data-testid` attributes preserved
  - Files: `apps/web/app/components/ApiKeyInput.tsx`
  - Completed: 2026-03-28 — Lock SVG left-icon, eye/eye-off toggle (data-testid=api-key-eye-toggle), focus border glow, filled green pill badge with checkmark; all prior api-key-input.spec.ts tests pass; 8 Playwright tests green

- [x] Task 5: Redesign PdfUpload — animated dropzone with upload icon (P0)
  - Acceptance: Dropzone displays a cloud-upload SVG icon (40px) above the helper text; drag-over state triggers `var(--color-accent-glow)` background and border-color pulse animation; file-selected state shows a document icon with file name and size in a pill; error state shows a red pill with shake animation; all `data-testid` attributes preserved
  - Files: `apps/web/app/components/PdfUpload.tsx`
  - Completed: 2026-03-28 — CloudUpload SVG icon (data-testid=pdf-upload-icon), helper text block (data-testid=pdf-upload-helper), drag-over accent-glow + pulse-border animation, file-selected DocumentIcon (data-testid=pdf-file-icon) + file pill, error red pill with animate-shake; all prior tests pass; 6 Playwright tests green

- [x] Task 6: Redesign GenerateButton — gradient button with shimmer hover (P0)
  - Acceptance: Enabled state renders an indigo→violet gradient background with a shimmer sweep animation on hover (pseudo-element sliding left-to-right); disabled state uses `var(--color-bg-elevated)` with muted text and `cursor-not-allowed`; button has 48px height and `--radius-md` corners; `data-testid="generate-button"` preserved
  - Files: `apps/web/app/components/GenerateButton.tsx`
  - Completed: 2026-03-28 — Indigo→violet linear-gradient, .btn-shimmer span sweeps on hover via shimmer keyframe in globals.css, disabled=bg-elevated+muted text, 48px height, hover lift+shadow; 6 Playwright tests green

- [x] Task 7: Redesign loading state — three bouncing dots with label (P0)
  - Acceptance: The `isLoading` block in `page.tsx` is replaced with three animated dots (each using `bounceDot` keyframe with staggered `animation-delay`) and the text "Generating your notebook…" in muted color; `data-testid="loading-indicator"` is on the container; error message uses a red pill badge with the `shake` keyframe on mount
  - Files: `apps/web/app/page.tsx`
  - Completed: 2026-03-28 — Three .animate-bounce-dot spans (data-testid=loading-dot) with 0/150/300ms stagger, loading-label text, error replaced with red pill div with animate-shake + info icon; 6 Playwright tests green

- [x] Task 8: Redesign ResultPanel — slide-up success card with distinct action buttons (P0)
  - Acceptance: `ResultPanel` wraps in a `slideUp` animation class on mount; shows an emerald checkmark circle icon and "Notebook ready!" heading; Download button is solid indigo with a download arrow icon; Open in Colab button is outlined with the Colab orange accent on text/border; both have hover lift effect (`translateY(-1px)` + shadow); `data-testid` attributes preserved
  - Files: `apps/web/app/components/ResultPanel.tsx`
  - Completed: 2026-03-28 — animate-slide-up card with emerald border/glow, CheckCircle icon (result-check-icon), "Notebook ready!" heading (result-heading), indigo gradient download button, outlined Colab-orange open button with ExternalLink icon; hover lift on both; 7 Playwright tests green

- [x] Task 9: Glass card wrapper and step dividers in main form (P1)
  - Acceptance: The three form sections (ApiKeyInput, PdfUpload, GenerateButton) are wrapped in a single glass card (`backdrop-filter: blur(12px)`, `var(--color-bg-surface)` background, 1px border using `var(--color-border)`); horizontal `<hr>` dividers with `var(--color-border)` separate the three steps; each step has a small numbered label ("1 · API Key", "2 · Upload PDF", "3 · Generate") in muted text above its control
  - Files: `apps/web/app/page.tsx`
  - Completed: 2026-03-28 — Three step sections with step-label class (data-testid=step-label-1/2/3) and two <hr data-testid=step-divider> dividers; card retains backdrop-filter:blur(12px); 7 Playwright tests green; 14 prior tests pass

- [x] Task 10: Update Playwright E2E screenshots and verify all tests pass (P1)
  - Acceptance: Run `npx playwright test` locally; all existing tests pass without modification (data-testid selectors unchanged); update screenshot baseline names in `tests/e2e/full-flow.spec.ts` to `task10-0N-description.png`; new screenshots captured in `tests/screenshots/`; `npx vitest run` also passes
  - Files: `tests/e2e/full-flow.spec.ts`, `tests/screenshots/`
  - Completed: 2026-03-28 — full-flow.spec.ts screenshots renamed to task10-08..13; sprint-v4-smoke.spec.ts (7 tests) covers full redesigned flow end-to-end; 78/78 Playwright tests pass; 146/146 vitest tests pass; sprint v4 complete
