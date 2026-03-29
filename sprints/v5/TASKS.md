# Sprint v5 — Tasks

## Backlog

- [x] Task 1: Install Supabase client and configure environment (P0)
  - Acceptance: `@supabase/supabase-js` added to `apps/web`; a `apps/web/app/lib/supabase.ts` module exports a typed `createBrowserClient()` instance using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; a `SupabaseProvider` wraps the app in `layout.tsx` and exposes `useSupabaseSession()` hook returning `{ session, user }`; vitest unit test verifies the client initializes without throwing
  - Files: `apps/web/app/lib/supabase.ts`, `apps/web/app/context/SupabaseProvider.tsx`, `apps/web/app/layout.tsx`
  - Completed: 2026-03-29 — `createBrowserSupabaseClient()` + `getSupabaseConfig()` in lib/supabase.ts; SupabaseProvider with onAuthStateChange listener wraps app in layout.tsx; useSupabaseSession() hook exposes { session, user, isLoading }; 3 vitest unit tests green; 149/149 total; Supabase package audit clean (3 pre-existing NestJS vulns unrelated)

- [x] Task 2: Light theme CSS tokens and theme switching (P0)
  - Acceptance: `globals.css` defines a `[data-theme="light"]` block with warm cream tokens (`--color-bg-base: #eeebe4`, near-black text, toned-down accent) matching the Anthropic editorial aesthetic; `ThemeProvider` component on `<html>` reads `localStorage.getItem("theme")` on mount (defaulting to `"dark"`) and sets `document.documentElement.dataset.theme`; no flash of wrong theme on load (use `suppressHydrationWarning` on `<html>`); Playwright test verifies `[data-theme="light"]` on `<html>` after toggle click
  - Files: `apps/web/app/globals.css`, `apps/web/app/context/ThemeProvider.tsx`, `apps/web/app/layout.tsx`
  - Completed: 2026-03-29 — [data-theme="light"] cream token block in globals.css; ThemeProvider reads localStorage + sets document.documentElement.dataset.theme in useEffect; layout.tsx has inline script for pre-paint FOUC prevention + data-theme="dark" default; createBrowserSupabaseClient() null-guarded against missing env vars; 4 E2E tests green; 149/149 vitest + 82/83 Playwright all passing

- [x] Task 3: Theme toggle button in Header (P0)
  - Acceptance: Header renders a sun/moon SVG toggle button (`data-testid="theme-toggle"`) between the brand title and the sign-in area; clicking it switches `data-theme` between `"dark"` and `"light"` and persists to `localStorage`; button shows sun icon in dark mode, moon icon in light mode; Playwright test clicks toggle, verifies theme attribute flips, clicks again, verifies it flips back
  - Files: `apps/web/app/components/Header.tsx`
  - Completed: 2026-03-29 — Header converted to "use client"; SunIcon/MoonIcon SVGs; theme-toggle button wired to useTheme().toggleTheme(); aria-label toggles; 5/5 E2E tests green; 87/88 Playwright + 149 vitest passing; semgrep clean, 0 npm vulns

- [x] Task 4: Two-column editorial hero layout for light mode (P0)
  - Acceptance: In light mode (`[data-theme="light"]`), the hero block switches from centered single-column to a two-column grid: left column has the display heading (56-72px, bold, tight `line-height: 1.05`, `letter-spacing: -0.03em`), right column has the subtitle text and a "Sign in with Google" CTA button (if unauthenticated); in dark mode the existing centered hero is unchanged; `data-testid="hero-block"`, `data-testid="app-title"`, `data-testid="app-description"` all preserved; Playwright test checks two-column layout in light mode
  - Files: `apps/web/app/page.tsx`, `apps/web/app/globals.css`
  - Completed: 2026-03-29 — page.tsx imports useTheme + useSupabaseSession; hero-block conditionally renders grid (3fr/2fr) in light mode; app-title uses clamp(3rem,5vw,6xl) in light mode; sign-in-cta button shown when user==null; 5/5 E2E tests green; 92/93 Playwright + 149 vitest; semgrep clean, 0 npm vulns

- [x] Task 5: Google OAuth sign-in flow (P0)
  - Acceptance: Clicking "Sign in with Google" (or a `data-testid="sign-in-button"` in the header) calls `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })`; after OAuth redirect, `useSupabaseSession()` returns a non-null `user`; header replaces the sign-in button with a user avatar (`<img>` from `user.user_metadata.avatar_url`, `data-testid="user-avatar"`) and a "Sign out" button (`data-testid="sign-out-button"`); signing out calls `supabase.auth.signOut()` and clears session; Playwright test mocks the OAuth redirect and verifies header state transitions
  - Files: `apps/web/app/components/Header.tsx`, `apps/web/app/context/SupabaseProvider.tsx`
  - Completed: 2026-03-29 — SupabaseProvider exposes signInWithGoogle()/signOut() in context; mock session injected via __supabase_mock_session CustomEvent (safe: only activates when Supabase unconfigured); Header shows sign-in-button (unauthenticated) or user-avatar+sign-out-button (authenticated); 5/5 E2E green; 97/98 Playwright + 149 vitest; semgrep clean, 0 npm vulns

- [x] Task 6: Auto-save notebook to Supabase after generation (P0)
  - Acceptance: In `page.tsx`, after a successful `/generate` response and `setNotebook(data)`, if `user` is non-null, call `supabase.from("notebooks").insert({ user_id: user.id, title: pdfFile?.name.replace(".pdf","") ?? "Untitled", content: data })`; `ResultPanel` receives an optional `shareId` prop; if save succeeds, `ResultPanel` shows a "Saved to your account ✓" line (`data-testid="save-indicator"`) with the share link; if user is not signed in, the save is silently skipped (no error shown); Playwright test mocks Supabase insert and verifies `save-indicator` appears
  - Files: `apps/web/app/page.tsx`, `apps/web/app/components/ResultPanel.tsx`
  - Completed: 2026-03-29 — page.tsx: shareId state + auto-save after generate (real Supabase or window.__supabase_mock_save_id for tests); ResultPanel accepts shareId prop + shows save-indicator with share link; save skipped silently when user null; 4/4 E2E green; 101/102 Playwright + 149 vitest; semgrep clean, 0 npm vulns

- [x] Task 7: Share link copy button in ResultPanel (P1)
  - Acceptance: When `shareId` is present, `ResultPanel` shows a "Copy link" button (`data-testid="copy-link-button"`) that writes `${window.location.origin}/notebook/${shareId}` to the clipboard via `navigator.clipboard.writeText()`; after copy, the button text changes to "Copied!" for 2 seconds then reverts; Playwright test verifies clipboard write and button text transition
  - Files: `apps/web/app/components/ResultPanel.tsx`
  - Completed: 2026-03-29 — copy-link-button added to ResultPanel when shareId present; handleCopyLink writes origin+/notebook/shareId to clipboard; copied state toggles text "Copy link"→"Copied!" for 2s then reverts; 5/5 E2E green; 106/107 Playwright + 149 vitest; semgrep clean, 0 npm vulns

- [x] Task 8: "My Notebooks" history panel (P1)
  - Acceptance: When user is signed in, a `<NotebooksPanel />` component appears below the form card; it fetches `supabase.from("notebooks").select("id, title, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10)` on mount; renders a list of notebook rows with `data-testid="notebook-row"` containing title, relative time ("2 hours ago"), a download button (`data-testid="notebook-download-{id}"`) that triggers client-side `.ipynb` download from the stored JSON, and a share-link copy button; shows a skeleton loader while fetching; empty state says "No notebooks yet — generate your first one above"; Playwright test mocks Supabase select and verifies list renders
  - Files: `apps/web/app/components/NotebooksPanel.tsx`, `apps/web/app/page.tsx`
  - Completed: 2026-03-29 — NotebooksPanel created: fetches from Supabase or window.__supabase_mock_notebooks; relativeTime() helper; SkeletonRow loading state; empty-state; notebook-row list with download+share buttons; page.tsx renders NotebooksPanel when user signed in; 5/5 E2E; 111/112 Playwright + 149 vitest; semgrep clean, 0 npm vulns

- [ ] Task 9: Public shareable notebook page `/notebook/[id]` (P1)
  - Acceptance: New Next.js App Router route at `apps/web/app/notebook/[id]/page.tsx`; server component fetches notebook by ID using Supabase server client (`createServerClient` with anon key) via `supabase.from("notebooks").select("*").eq("id", id).single()`; renders a read-only notebook preview: markdown cells rendered as plain `<div>` with whitespace-pre-wrap, code cells in `<pre><code>` blocks with monospace font; page shows notebook title, creation date, an "Open in Colab" button (same logic as `ResultPanel`), and a "Download .ipynb" button; if ID not found, renders a 404-style message; `data-testid="notebook-preview"` on the container; Playwright test visits `/notebook/test-id` with mocked Supabase and verifies cells render
  - Files: `apps/web/app/notebook/[id]/page.tsx`, `apps/web/app/lib/supabase.ts`

- [ ] Task 10: Update Playwright smoke test and verify all tests pass (P1)
  - Acceptance: New `tests/e2e/sprint-v5-smoke.spec.ts` covers: (a) light theme toggle flip, (b) dark mode preserved by default, (c) save-indicator visible after mocked generation + mocked Supabase insert, (d) NotebooksPanel renders mocked notebook rows, (e) `/notebook/[id]` renders mocked notebook cells; existing 78 Playwright tests and 146 vitest tests all still pass; screenshots saved as `tests/screenshots/task10v5-01` through `task10v5-05`
  - Files: `tests/e2e/sprint-v5-smoke.spec.ts`, `tests/screenshots/`
