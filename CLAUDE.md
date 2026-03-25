# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a sprint-based development workspace. Projects are planned and built iteratively using two custom skills:

- **`/prd`** — Brainstorm requirements, create a sprint PRD and atomic task list in `sprints/vN/`
- **`/dev`** — Pick the highest-priority uncompleted task from the latest sprint and implement it

There is no fixed tech stack — each project defines its own stack in its sprint PRD.

## Workflow

1. Run `/prd` to create `sprints/vN/PRD.md` (requirements) and `sprints/vN/TASKS.md` (atomic backlog)
2. Run `/dev` repeatedly to implement tasks one at a time in priority order (P0 → P1 → P2)
3. Each `/dev` invocation follows: **read task → write tests → implement → run tests → security scan → mark complete → commit**

## Sprint Structure

```
sprints/
  vN/
    PRD.md         # Requirements, architecture, user stories
    TASKS.md       # Ordered, atomic task checklist
    WALKTHROUGH.md # Written after sprint completion (read by next sprint's /prd)
```

## Key Conventions

- **TDD is mandatory**: write tests before implementation code
- **One task per `/dev` run**: never combine multiple tasks
- **Security scan after every task**: run `semgrep --config auto` and `npm audit` (or equivalent)
- **Playwright E2E tests** must take screenshots to `tests/screenshots/taskN-stepN-description.png` and use `data-testid` selectors
- **Test layout**: `tests/unit/`, `tests/integration/`, `tests/e2e/`
- **Commit format**: `feat(vN): Task N — [description]` with test/security summary in body
- v1 sprints are capped at 10 tasks; each task should take 5-10 minutes
- Bugs found in existing code get new tasks, not inline fixes
