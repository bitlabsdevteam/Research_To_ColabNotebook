# Sprint v1 — Paper2Notebook: Research Paper to Colab Tutorial Generator

## Sprint Overview

Build a web application that accepts a research paper PDF, extracts its content (text, equations, figures, algorithms), and uses OpenAI's GPT-5.4 to generate a Google Colab notebook that implements the paper's key algorithms and methodology as an interactive tutorial. The user provides their own OpenAI API key via the frontend.

## Goals

- **G1**: User can upload a PDF research paper through a clean web UI
- **G2**: Backend extracts full paper content — text, equations, figures/diagrams, and algorithm pseudocode
- **G3**: GPT-5.4 analyzes the extracted content and generates a structured Colab-ready `.ipynb` notebook
- **G4**: User can download the generated notebook OR open it directly in Google Colab
- **G5**: API key is entered on the frontend and used per-session (never persisted server-side)

## User Stories

1. **As a** researcher, **I want to** upload a PDF of a research paper, **so that** I get an interactive Colab notebook that implements the paper's algorithms.
2. **As a** student, **I want to** enter my OpenAI API key in the browser, **so that** I can use the tool without any server-side setup.
3. **As a** user, **I want to** download the generated `.ipynb` file or open it directly in Google Colab, **so that** I can start experimenting immediately.
4. **As a** user, **I want** the notebook to include explanatory markdown cells alongside code cells, **so that** it serves as a tutorial, not just raw code.

## Technical Architecture

### Tech Stack

| Layer        | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 15 (React 19, App Router)  |
| Backend API | NestJS (TypeScript, most feature-rich TS backend framework) |
| PDF Parsing | `pdf-parse` + `pdfjs-dist` (text extraction), `pdf2pic` (figure extraction) |
| AI          | OpenAI GPT-5.4 via `openai` SDK    |
| Notebook    | Custom `.ipynb` JSON builder        |
| Styling     | Tailwind CSS 4                      |
| File Upload | Multer (via NestJS)                 |

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                      │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ API Key  │  │  PDF Upload  │  │  Download / Open   │  │
│  │  Input   │  │  Dropzone    │  │  in Colab Button   │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬──────────┘  │
│       │               │                    │             │
└───────┼───────────────┼────────────────────┼─────────────┘
        │               │                    │
        ▼               ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                   NestJS Backend API                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ PDF Parser   │  │  AI Service  │  │  Notebook     │  │
│  │  Module      │  │  (GPT-5.4)  │  │  Builder      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                 │                  │           │
│         ▼                 ▼                  ▼           │
│  ┌─────────────────────────────────────────────────┐    │
│  │            Pipeline Orchestrator                 │    │
│  │  PDF → Extract → Analyze → Generate → .ipynb    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User enters OpenAI API key → stored in browser state (React context)
2. User uploads PDF → POST /api/generate (multipart form: pdf + apiKey)
3. Backend: PDF → pdf-parse (text, structure) + pdf2pic (figures as base64)
4. Backend: Extracted content → GPT-5.4 prompt → structured notebook JSON
5. Backend: Assemble .ipynb (markdown tutorial cells + code cells + figure cells)
6. Response: .ipynb file returned to frontend
7. User clicks "Download" or "Open in Colab" (uploads to Colab via gist URL)
```

### "Open in Colab" Strategy

Google Colab can open notebooks from public URLs using:
```
https://colab.research.google.com/github/{user}/{repo}/blob/main/{path}
```
For our case, the simplest approach:
- Backend returns the `.ipynb` content
- Frontend creates a temporary public GitHub Gist via the GitHub Gist API (or uses a data URI)
- Alternative: encode notebook as base64 and use `colab.research.google.com/#create=true` with upload

For v1, we will support **download** and a **"Copy Colab upload link"** approach using a lightweight blob URL strategy.

## Out of Scope (v1)

- User authentication / accounts
- Persistent storage / database
- Paper history or saved notebooks
- Real-time streaming of generation progress (SSE/WebSocket)
- Support for non-English papers
- Custom notebook templates or styling
- Batch processing of multiple PDFs
- GitHub Gist integration for "Open in Colab"

## Dependencies

- Node.js 20+
- OpenAI API key (provided by user)
- System-level dependencies for PDF figure extraction (Ghostscript / GraphicsMagick for `pdf2pic`)
