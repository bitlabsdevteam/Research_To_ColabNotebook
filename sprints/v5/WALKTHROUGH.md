# Sprint v5 — Walkthrough

## Summary

Sprint v5 added two parallel tracks to Paper2Notebook: a premium editorial light theme (inspired by Anthropic's visual identity) with a dark/light toggle, and a complete auth-and-persistence layer via Supabase. Users can now sign in with Google, have their generated notebooks automatically saved to Supabase Postgres, view a "My Notebooks" history panel, and share any notebook via a public permalink (`/notebook/[id]`) that requires no login to view.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser                                                             │
│                                                                      │
│  layout.tsx                                                          │
│  ├── <html data-theme="dark|light">  ← inline script sets pre-paint │
│  ├── ThemeProvider  (localStorage ↔ document.documentElement)        │
│  ├── SupabaseProvider  (Supabase session ↔ Google OAuth)             │
│  └── ApiKeyProvider                                                  │
│                                                                      │
│  page.tsx  (Home)                                                    │
│  ├── Header  [theme-toggle] [sign-in / avatar+sign-out]              │
│  ├── hero-block  (1-col dark | 2-col light editorial)                │
│  ├── form-card  [API key → PDF upload → Generate]                    │
│  ├── ResultPanel  [download | open-colab | save-indicator | copy-link]│
│  └── NotebooksPanel  (only when user signed in)                      │
│                                                                      │
│  /notebook/[id]/page.tsx  (public share page)                        │
│  └── NotebookViewer  [cell-markdown | cell-code | download | colab]  │
│                                                                      │
└──────────────────┬────────────────────────────┬─────────────────────┘
                   │ Supabase JS client          │ fetch
                   ▼                             ▼
      ┌────────────────────────┐      ┌──────────────────┐
      │  Supabase              │      │  NestJS API       │
      │  Auth (Google OAuth)   │      │  POST /generate   │
      │  Postgres: notebooks   │      │  (unchanged v4)   │
      │    id, user_id,        │      └──────────────────┘
      │    title, content,     │
      │    created_at          │
      └────────────────────────┘
```

---

## Files Created/Modified

### `apps/web/app/lib/supabase.ts`
**Purpose**: Factory module for Supabase client instances; returns `null` when env vars are absent so the app degrades gracefully in local/test environments.

**Key Functions**:
- `getSupabaseConfig()` — reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from env
- `createBrowserSupabaseClient()` — returns a typed Supabase client or `null` if not configured
- `createServerSupabaseClient()` — same, for use in server components (both use anon key for now)

**How it works**:

Every component that needs Supabase calls one of these factories rather than calling `createClient` directly. The null check is the key design decision: rather than throwing when env vars are missing (which would break local dev and test runs), the function returns `null` and every caller has a fallback branch.

```ts
export function createBrowserSupabaseClient() {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}
```

This pattern means the entire auth and persistence layer is opt-in: the app renders and all tests pass even with no Supabase project configured.

---

### `apps/web/app/context/SupabaseProvider.tsx`
**Purpose**: React context provider that owns the Supabase auth session and exposes `user`, `signInWithGoogle()`, and `signOut()` to the whole component tree.

**Key Exports**:
- `SupabaseProvider` — wraps the app; subscribes to `onAuthStateChange`
- `useSupabaseSession()` — hook returning `{ session, user, isLoading, signInWithGoogle, signOut }`

**How it works**:

On mount, if a real Supabase client is available, the provider calls `getSession()` to hydrate any existing session and subscribes to `onAuthStateChange` for subsequent sign-in/sign-out events. When Supabase is absent (no env vars), it falls back to listening for a `__supabase_mock_session` CustomEvent — this is how Playwright E2E tests inject a mock user without needing real OAuth.

```tsx
if (!supabase) {
  setIsLoading(false);
  const handler = (e: Event) => {
    setSession((e as CustomEvent).detail as Session | null);
  };
  window.addEventListener("__supabase_mock_session", handler);
  return () => window.removeEventListener("__supabase_mock_session", handler);
}
```

`signInWithGoogle()` calls `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })`. After the OAuth redirect, Supabase handles the code exchange and fires `onAuthStateChange`, which updates `session` state automatically.

---

### `apps/web/app/context/ThemeProvider.tsx`
**Purpose**: Manages the `"dark" | "light"` theme state, persists it to `localStorage`, and writes it to `document.documentElement.dataset.theme` so CSS can apply the correct token set.

**Key Exports**:
- `ThemeProvider` — wraps the app; reads `localStorage` on mount
- `useTheme()` — hook returning `{ theme, toggleTheme }`

**How it works**:

There are two layers of theme-setting to avoid flash of wrong theme (FOUC):

1. **Inline script in `layout.tsx`** runs synchronously before React hydrates, immediately setting `data-theme` from `localStorage`. This prevents the page flashing dark then switching to light.
2. **`ThemeProvider` `useEffect`** runs after hydration and re-syncs React state with whatever the inline script set.

```tsx
// layout.tsx — runs before paint
<script dangerouslySetInnerHTML={{
  __html: `(function(){try{var t=localStorage.getItem('theme');
    document.documentElement.dataset.theme=t==='light'?'light':'dark';
  }catch(e){}})();`
}} />
```

`toggleTheme()` updates both `localStorage` and `document.documentElement.dataset.theme` synchronously so CSS transitions apply immediately without a React render cycle delay.

---

### `apps/web/app/globals.css` (modified)
**Purpose**: Adds the `[data-theme="light"]` CSS token block alongside the existing dark-mode `:root` tokens.

**Key Addition**:

```css
[data-theme="light"] {
  --color-bg-base:     #eeebe4;   /* warm cream — Anthropic editorial */
  --color-bg-surface:  #e8e4dc;
  --color-bg-elevated: #dedad2;
  --color-text-primary:   #0d0d0d;
  --color-accent:       #1a1a1a;  /* dark ink instead of indigo */
  --color-success:      #15803d;
  --color-error:        #b91c1c;
}
```

Because every component uses CSS custom properties (e.g. `var(--color-bg-base)`) rather than hard-coded colors, switching themes is just a matter of swapping this single `data-theme` attribute — no JavaScript re-renders needed for the visual change.

---

### `apps/web/app/layout.tsx` (modified)
**Purpose**: Root layout wrapping the provider stack; now includes `ThemeProvider`, `SupabaseProvider`, the FOUC-prevention inline script, and `suppressHydrationWarning` to silence React's server/client mismatch warning caused by the inline script mutating `data-theme`.

**Key Change**:
```tsx
<html lang="en" data-theme="dark" suppressHydrationWarning>
  <script dangerouslySetInnerHTML={{ __html: `/* FOUC prevention */` }} />
  <ThemeProvider>
    <SupabaseProvider>
      <ApiKeyProvider>{children}</ApiKeyProvider>
    </SupabaseProvider>
  </ThemeProvider>
```

Providers are nested from outermost (theme) to innermost (API key) so each can access the ones above it if needed.

---

### `apps/web/app/components/Header.tsx` (modified)
**Purpose**: Sticky top navigation bar; now also owns the theme toggle button and the auth section (sign-in button or avatar + sign-out button).

**Key Changes**:
- Added `SunIcon` / `MoonIcon` SVG components (inline, no external dependency)
- `<button data-testid="theme-toggle">` calls `toggleTheme()` from `useTheme()`; shows sun in dark mode, moon in light mode
- Auth section: when `user` is null, shows `data-testid="sign-in-button"`; when `user` is set, shows `data-testid="user-avatar"` (or initial fallback) + `data-testid="sign-out-button"`

```tsx
{user ? (
  <>
    <img data-testid="user-avatar" src={user.user_metadata.avatar_url} />
    <button data-testid="sign-out-button" onClick={signOut}>Sign out</button>
  </>
) : (
  <button data-testid="sign-in-button" onClick={signInWithGoogle}>Sign in</button>
)}
```

---

### `apps/web/app/page.tsx` (modified)
**Purpose**: Main page orchestrator; now reads `theme` and `user` state to conditionally render the editorial two-column hero layout and the `NotebooksPanel`, and auto-saves generated notebooks to Supabase.

**Key Changes**:

**1. Two-column hero in light mode** — `isLight = theme === "light"` drives the hero layout:
```tsx
<div data-testid="hero-block" style={isLight ? {
  display: "grid",
  gridTemplateColumns: "3fr 2fr",
  gap: "var(--space-10)",
} : { textAlign: "center", maxWidth: "560px" }}>
```
Dark mode keeps the existing centered single-column layout untouched.

**2. Auto-save after generation** — after a successful `/generate` response, if `user` is non-null:
```tsx
const { data: saved } = await supabase
  .from("notebooks")
  .insert({ user_id: user.id, title, content: data })
  .select("id")
  .single();
if (saved?.id) setShareId(saved.id);
```
The `shareId` is passed down to `ResultPanel` which shows the save indicator and share link.

**3. NotebooksPanel** — rendered below `ResultPanel` when user is signed in:
```tsx
{user && <NotebooksPanel user={user} />}
```

---

### `apps/web/app/components/ResultPanel.tsx` (modified)
**Purpose**: Success panel shown after notebook generation; now accepts an optional `shareId` prop and renders a save indicator and copy-link button when present.

**Key Additions**:

**Save indicator** (shown when `shareId` is set):
```tsx
{shareId && (
  <div data-testid="save-indicator">
    ✓ Saved to your account · <a href={`/notebook/${shareId}`}>Share link</a>
  </div>
)}
```

**Copy link button** with 2-second "Copied!" feedback:
```tsx
async function handleCopyLink() {
  await navigator.clipboard.writeText(
    `${window.location.origin}/notebook/${shareId}`
  );
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
}
```

---

### `apps/web/app/components/NotebooksPanel.tsx` (new)
**Purpose**: "My Notebooks" history panel displayed below the form when the user is signed in; fetches the user's 10 most recent notebooks from Supabase and lists them with relative timestamps, download, and share buttons.

**Key Functions**:
- `relativeTime(iso)` — converts an ISO timestamp to human-readable relative format: `5m ago`, `2h ago`, `3d ago`
- `SkeletonRow` — animated placeholder shown during initial load
- `NotebooksPanel` — main component; fetches from Supabase or `window.__supabase_mock_notebooks` in test environments

**How it works**:

```tsx
const { data } = await supabase
  .from("notebooks")
  .select("id, title, created_at")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false })
  .limit(10);
```

Note that `content` is not fetched in the list query — it's only needed if the user downloads directly from the panel row, at which point the `content` would need to be fetched on demand (currently download from the panel requires `content` in the row object, which is only present in mock data; production download from the panel is a known limitation).

---

### `apps/web/app/notebook/[id]/page.tsx` (new)
**Purpose**: Public share page server component for a notebook permalink; passes the dynamic `id` param to the `NotebookViewer` client component.

**Key Detail — Next.js 15 async params**:
```tsx
interface Props { params: Promise<{ id: string }>; }

export default async function NotebookPage({ params }: Props) {
  const { id } = await params;
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg-base)" }}>
      <NotebookViewer id={id} />
    </div>
  );
}
```
Next.js 15 requires `params` to be typed as `Promise<...>` and awaited. This was the root cause of a Docker build failure discovered during deployment — TypeScript rejected the old synchronous `{ id: string }` type as incompatible with the new `PageProps` constraint.

---

### `apps/web/app/notebook/[id]/NotebookViewer.tsx` (new)
**Purpose**: Client component that fetches a notebook record from Supabase by ID and renders it as a read-only preview with markdown and code cells.

**Cell rendering**:
- Markdown cells: `<div data-testid="cell-markdown">` with `whiteSpace: "pre-wrap"` — renders raw markdown source as readable pre-formatted text (not parsed/HTML-rendered)
- Code cells: `<pre data-testid="cell-code"><code>` with monospace font and `whiteSpace: "pre"`

**Source normalization** — Jupyter notebooks store cell source as either a single string or an array of strings:
```ts
function cellSource(source: string | string[]): string {
  return Array.isArray(source) ? source.join("") : source;
}
```

**404 state** — when the Supabase query returns no data:
```tsx
<div data-testid="notebook-not-found">
  <h2>Notebook not found</h2>
  <p>The notebook you're looking for doesn't exist or has been removed.</p>
</div>
```

---

### `apps/web/Dockerfile` (modified)
**Purpose**: Multi-stage build for the Next.js frontend; fixed to correctly copy static assets for Next.js standalone monorepo output.

**The Bug and Fix**:

Next.js standalone output for a monorepo mirrors the full directory tree. When `next build` runs from `/app/apps/web`, the `server.js` entry point is placed at `apps/web/server.js` inside the standalone folder, and it resolves assets relative to `apps/web/`. The previous Dockerfile copied assets to the wrong paths:

```dockerfile
# Before (wrong — assets at /app/.next/static, server looks in /app/apps/web/.next/static)
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/.next/static ./.next/static

# After (correct)
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
```

This was the root cause of the white/unstyled page seen after initial ECS deployment — CSS custom properties weren't loading because the static CSS files were returning 404.

**Additional fix**: Added `.gitkeep` to `apps/web/public/` — Docker's `COPY` fails silently on empty directories, causing build failures in CI.

---

### `.github/workflows/cd.yml` (modified)
**Purpose**: CD pipeline that builds Docker images and deploys to AWS ECS Fargate on every push to `main`.

**Key Change**: Added `--platform linux/amd64` to both `docker build` commands to ensure images built on Apple Silicon (M1/M2) Macs or GitHub's ARM runners are compatible with ECS Fargate (x86_64):

```yaml
run: |
  docker build --platform linux/amd64 \
    -t $ECR_REGISTRY/paper2notebook-frontend:$IMAGE_TAG \
    -f apps/web/Dockerfile .
```

---

## Data Flow

### Theme switching
```
User clicks theme-toggle
  → toggleTheme() in ThemeProvider
  → localStorage.setItem("theme", next)
  → document.documentElement.dataset.theme = next
  → CSS [data-theme="light"] or :root token set activates
  → All components re-render with new CSS variable values
  → No API calls required — pure CSS token swap
```

### Auth flow
```
User clicks "Sign in with Google" (Header or hero CTA)
  → signInWithGoogle() → supabase.auth.signInWithOAuth({ provider: "google" })
  → Browser redirects to Google consent screen
  → Google redirects back to origin/?code=...
  → Supabase exchanges code for session, stores in localStorage
  → onAuthStateChange fires → SupabaseProvider sets session
  → Header shows user-avatar + sign-out-button
  → NotebooksPanel appears, fetches user's notebooks
```

### Generate + auto-save
```
User fills API key + uploads PDF → clicks Generate
  → page.tsx: POST /generate with Bearer token + PDF
  → NestJS returns notebook JSON
  → setNotebook(data) → ResultPanel renders
  → If user is signed in:
      → supabase.from("notebooks").insert({ user_id, title, content })
      → setShareId(saved.id)
      → ResultPanel shows save-indicator + copy-link-button
```

### Share link visit
```
User visits /notebook/abc-123
  → Next.js renders /notebook/[id]/page.tsx (server component, awaits params)
  → Passes id to NotebookViewer (client component)
  → NotebookViewer: supabase.from("notebooks").select("*").eq("id", id).single()
  → Renders cells: markdown as div[data-testid="cell-markdown"],
                   code as pre[data-testid="cell-code"]
  → "Download .ipynb" and "Open in Colab" buttons available
  → No login required (Supabase RLS "public read by id" policy)
```

---

## Test Coverage

**Vitest unit tests**: 149 total
- `supabase.test.ts` — `createBrowserSupabaseClient()` initializes without throwing; returns null when env vars absent; `getSupabaseConfig()` reads env vars correctly

**Playwright E2E tests**: 122 passing (1 legacy skip)

New test files added in v5:

| File | Tests | What it covers |
|------|-------|----------------|
| `theme-toggle.spec.ts` | 5 | Toggle flips dark→light→dark; persists across reload; aria-label updates |
| `hero-layout.spec.ts` | 5 | Two-column grid in light mode; single-column in dark mode; sign-in CTA visible |
| `auth-flow.spec.ts` | 5 | sign-in-button visible when unauth; user-avatar + sign-out-button after mock login; sign-out clears session |
| `notebook-save.spec.ts` | 4 | save-indicator appears after mocked generation + mocked Supabase insert |
| `copy-link.spec.ts` | 5 | copy-link-button writes URL to clipboard; text changes "Copy link"→"Copied!" for 2s |
| `notebooks-panel.spec.ts` | 5 | Panel appears when signed in; renders notebook-row items; empty state; relative time |
| `notebook-page.spec.ts` | 6 | /notebook/[id] renders cells; markdown cell; code cell; not-found state; download button; open-colab button |
| `sprint-v5-smoke.spec.ts` | 5 | Full sprint regression covering all 5 acceptance scenarios |

---

## Security Measures

- **Supabase Row-Level Security**: `notebooks` table has RLS enabled. The `owner access` policy ensures users can only read/write their own notebooks via the authenticated client. The `public read by id` policy allows the share page to work without auth.
- **No secrets in client code**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the public anon key (safe to expose); the service role key is never used in the frontend.
- **OAuth only**: No password handling — all auth delegated to Google via Supabase OAuth, eliminating credential storage risk.
- **`__supabase_mock_session` event**: Only activates when Supabase env vars are absent (i.e., unconfigured local/test environments). In production, both env vars are set so the mock event listener is never registered.
- **semgrep**: Clean on all 10 tasks. `npm audit`: 0 vulnerabilities in frontend dependencies (3 pre-existing NestJS vulns in backend, unrelated to v5).
- **Docker**: `--platform linux/amd64` explicit flag prevents accidental ARM image pushes to x86 ECS tasks.

---

## Known Limitations

1. **Download from NotebooksPanel requires `content` in the row** — the panel query only fetches `id, title, created_at` (not `content`) for performance. The download button only works if `content` is present (it is in mock data but not in real Supabase queries from the panel). A follow-up task should fetch `content` on demand when the download button is clicked.

2. **Markdown rendered as plain text** — cells with `cell_type: "markdown"` are displayed with `whiteSpace: "pre-wrap"` but are not parsed as Markdown. Headers, bold, links, and lists appear as raw `#`, `**`, `[text](url)` syntax. A v6 task should add a lightweight Markdown renderer (e.g. `react-markdown`).

3. **No session persistence across page navigations** — the Supabase client stores the session in `localStorage`, which works across reloads, but the `SupabaseProvider` re-runs `getSession()` on every mount. This is correct but could be optimized.

4. **No mobile responsive layout** — the two-column editorial hero and the notebooks panel are not optimized for small viewports. Explicitly out of scope for v5; planned for v6.

5. **"Open in Colab" from share page** — the share page's "Open in Colab" button encodes the notebook as a data URI. For large notebooks this URL can exceed browser limits and fail silently.

6. **CD pipeline requires manual ECR repo creation** — the Terraform infra creates ECS resources but the ECR repository names (`paper2notebook-backend`, `paper2notebook-frontend`) must exist in AWS before the CD pipeline can push. This is a one-time manual step not automated in the pipeline.

---

## What's Next (v6 Suggestions)

1. **arXiv URL input** — accept an arXiv paper URL in addition to PDF upload; fetch PDF server-side in NestJS
2. **Markdown rendering in notebook preview** — integrate `react-markdown` for the `/notebook/[id]` page
3. **Mobile responsive layout** — add breakpoints for the two-column hero and panels
4. **Model selector** — let users choose GPT-4o vs GPT-4-turbo in the form card
5. **Notebook history download fix** — fetch `content` on-demand from the NotebooksPanel download button
6. **Delete notebook** — allow users to delete entries from their history panel
7. **Notebook editing** — allow re-naming notebook titles in the history panel
