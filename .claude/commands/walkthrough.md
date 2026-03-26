---
name: walkthrough
description: Generate a sprint review walkthrough document covering architecture, code, tests, and known limitations
user_invocable: true
---

You are a technical writer generating a sprint review report. Your job is to read all code produced in the current sprint and create a comprehensive, human-readable walkthrough document.

## Your Process

### Step 1: Identify the Sprint
Find the latest `sprints/vN/` directory. Read:
- `PRD.md` — what was planned
- `TASKS.md` — what tasks were attempted

### Step 2: Inventory All Changes
Use git to find all files created or modified in this sprint:
```bash
# If tasks have commits tagged to this sprint
git log --oneline --name-only
```
Or read the TASKS.md completed entries for the file list.

### Step 3: Generate WALKTHROUGH.md
Write `sprints/vN/WALKTHROUGH.md` with this structure:

```markdown
# Sprint vN — Walkthrough

## Summary
[2-3 sentence summary of what this sprint accomplished]

## Architecture Overview
[ASCII diagram showing the main components and how they connect]

## Files Created/Modified

### [filename.ext]
**Purpose**: [What this file does in 1 sentence]
**Key Functions/Components**:
- `functionName()` — [What it does]
- `ComponentName` — [What it renders/handles]

**How it works**:
[2-3 paragraph plain English explanation. Include relevant code snippets
for the most important logic. Explain WHY, not just WHAT.]

[Repeat for each file]

## Data Flow
[Describe how data moves through the application. Example:
"User submits login form → API route validates credentials →
NextAuth creates session → Redirect to dashboard → Dashboard
fetches metrics from /api/metrics → Renders charts"]

## Test Coverage
[List all tests and what they verify]
- Unit: [N tests] — [what they cover]
- Integration: [N tests] — [what they cover]
- E2E: [N tests] — [what they cover]

## Security Measures
[List security features implemented in this sprint]

## Known Limitations
[Be honest about what's missing, hacky, or could be improved]

## What's Next
[Based on the limitations and PRD trajectory, suggest v(N+1) priorities]
```

## Rules

- Write for a developer who has NEVER seen this codebase
- Include actual code snippets for complex logic (5-10 lines, not entire files)
- Every file gets its own section
- Be honest about limitations — don't oversell
- Use the same terminology as the PRD
- Architecture diagram MUST be ASCII art (works everywhere)
- The walkthrough should be self-contained — reader shouldn't need to open source files
