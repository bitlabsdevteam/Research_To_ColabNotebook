# Sprint v5 — Editorial Light Theme + Auth + Persistence

## Sprint Overview

Sprint v5 has two parallel tracks. The first reshapes the visual identity of Paper2Notebook from its current dark glass aesthetic into a premium editorial light theme inspired by the Anthropic.com design language — warm cream background, heavy display typography, two-column hero layout, with the existing dark mode preserved as a toggle. The second track adds a complete auth and persistence layer using Supabase (Google OAuth, Postgres notebooks table, and shareable public links) so users can save and revisit their generated notebooks.

## Goals

- **G1**: Ship a light/cream theme (Anthropic-inspired editorial aesthetic) with a theme toggle in the header; dark theme remains default and fully functional
- **G2**: Integrate Google OAuth via Supabase Auth — sign in/out in the header with user avatar, session persisted across page loads
- **G3**: Auto-save every generated notebook to Supabase Postgres under the authenticated user's account
- **G4**: "My Notebooks" history panel listing the user's saved notebooks with timestamps and one-click re-download
- **G5**: Shareable public link (`/notebook/[id]`) that renders a read-only notebook preview for any visitor (no login required)

## User Stories

1. **As a** first-time visitor, **I want** a clean, editorial light-mode page, **so that** the product feels trustworthy and professional (referencing the Anthropic aesthetic).
2. **As a** user who prefers dark mode, **I want** a theme toggle in the header, **so that** I can switch back to the dark glass design I'm used to.
3. **As a** returning user, **I want** to sign in with Google and see my previously generated notebooks, **so that** I don't have to re-generate work I've already done.
4. **As a** user who just generated a notebook, **I want** it saved automatically to my account, **so that** I never lose a result.
5. **As a** user who wants to share results, **I want** a shareable link to my notebook, **so that** collaborators can view (not download from my account) the notebook without signing in.

## Technical Architecture

### Stack (additions to v4)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Auth | Supabase Auth (Google OAuth) | Handles OAuth flow, session tokens, user table |
| Database | Supabase Postgres | `notebooks` table: id, user_id, title, content (JSONB), created_at |
| Frontend client | `@supabase/supabase-js` | Auth state, notebook CRUD from Next.js |
| Theme | CSS `[data-theme]` attribute on `<html>` | Two token sets; persisted in localStorage |
| Sharing | Next.js App Router `/notebook/[id]` | Public route, reads from Supabase with anon key |

### Design System — Light Theme Tokens

The light theme takes direct inspiration from the Anthropic.com editorial aesthetic:

```
[data-theme="light"] {
  /* Backgrounds */
  --color-bg-base:     #eeebe4   /* warm cream base */
  --color-bg-surface:  #e8e4dc   /* slightly darker card surface */
  --color-bg-elevated: #dedad2   /* input / hover surface */

  /* Borders */
  --color-border:       rgba(0, 0, 0, 0.10)
  --color-border-focus: rgba(0, 0, 0, 0.50)

  /* Typography */
  --color-text-primary:   #0d0d0d   /* near-black, high contrast */
  --color-text-secondary: #4a4a4a
  --color-text-muted:     #8a8a8a

  /* Accent — toned down for light bg */
  --color-accent:      #1a1a1a   /* dark ink, not indigo */
  --color-accent-light: #3a3a3a
  --color-accent-glow: rgba(0, 0, 0, 0.06)

  /* Status */
  --color-success:      #15803d   /* green-700 */
  --color-error:        #b91c1c   /* red-700 */
  --color-colab:        #c27d00   /* amber-700 */
}
```

### Hero Layout — Two-Column Editorial (Light Mode)

Inspired by the Anthropic.com hero: the heading occupies the left ~60% of the viewport at large display weight, the subtitle/description floats right-aligned in the right ~35%.

```
┌─────────────────────────────────────────────────────────────────────┐
│  <Header>                                                            │
│  Paper2Notebook logo   [nav spacer]    [☀/🌙 toggle] [Sign in]      │
│─────────────────────────────────────────────────────────────────────│
│                                                                      │
│  ┌──────────────────────────────┐   ┌──────────────────────────┐   │
│  │                              │   │                          │   │
│  │  Turn any research           │   │  Paste your OpenAI key,  │   │
│  │  paper into a                │   │  drop a PDF, and get a   │   │
│  │  Colab tutorial.             │   │  fully-runnable Colab    │   │
│  │                              │   │  notebook instantly.     │   │
│  │  (display font, 56-72px,     │   │                          │   │
│  │   bold, tight leading)       │   │  [Sign in with Google →] │   │
│  │                              │   │                          │   │
│  └──────────────────────────────┘   └──────────────────────────┘   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  [FORM CARD — full width, clean border, no glass blur in light mode] │
│  Step 1: API Key   |   Step 2: Upload PDF   |   Step 3: Generate     │
│                                                                      │
│  [MY NOTEBOOKS panel — only shown when signed in]                    │
│  Recent: notebook-title.ipynb  2h ago  [↓]  [🔗 share]             │
│                                                                      │
│─────────────────────────────────────────────────────────────────────│
│  <Footer>                                                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Supabase Schema

```sql
-- notebooks table (created via Supabase dashboard or migration)
create table notebooks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  title       text not null default 'Untitled Notebook',
  content     jsonb not null,
  created_at  timestamptz default now()
);

-- Row-level security
alter table notebooks enable row level security;

-- Users can only read/write their own notebooks
create policy "owner access" on notebooks
  for all using (auth.uid() = user_id);

-- Anyone can read a notebook by ID (for sharing)
create policy "public read by id" on notebooks
  for select using (true);
```

### Data Flow — Auth + Save

```
User clicks "Sign in with Google"
  → Supabase Auth redirects to Google OAuth
  → Google returns auth code → Supabase exchanges for session
  → Supabase session stored in localStorage/cookie
  → Header shows user avatar + "Sign out"
  → My Notebooks panel loads from Supabase

User generates notebook (existing flow)
  → POST /generate → NestJS → OpenAI → notebook JSON returned
  → If user is signed in:
      → supabase.from("notebooks").insert({ user_id, title, content })
      → My Notebooks panel refreshes
  → ResultPanel shows "Saved ✓" indicator + share link

User visits /notebook/[id]
  → Next.js SSR fetches notebook by ID via Supabase anon key
  → Renders read-only notebook preview (markdown cells as HTML, code cells in <pre>)
  → "Open in Colab" button present
```

### Environment Variables Required

```bash
# apps/web/.env.local (not committed)
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]

# Keep existing:
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Out of Scope (v5)

- arXiv URL input as alternative to PDF (v6)
- Model selector (GPT-4o vs GPT-4-turbo) (v6)
- Notebook preview before download (v6)
- Email/password or magic-link auth (Supabase Google OAuth only)
- Mobile responsive breakpoints (v6)
- Backend changes to NestJS (notebooks saved directly from frontend via Supabase client)
- Notebook editing or re-generation from history

## Dependencies

- Sprint v4 complete (all 224 tests passing)
- Supabase project created with Google OAuth provider enabled (user must do this manually — one-time setup)
- Google Cloud Console OAuth credentials created and added to Supabase dashboard
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in `.env.local`
- No changes to NestJS backend or Terraform infra required
