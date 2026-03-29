"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "../../lib/supabase";
import { downloadNotebook, openInColab } from "../../lib/colab";

interface NotebookCell {
  cell_type: "markdown" | "code" | string;
  source: string | string[];
  metadata?: object;
  outputs?: unknown[];
}

interface NotebookContent {
  nbformat?: number;
  cells: NotebookCell[];
  metadata?: object;
}

interface NotebookRecord {
  id: string;
  title: string;
  created_at: string;
  content: NotebookContent;
}

function cellSource(source: string | string[]): string {
  return Array.isArray(source) ? source.join("") : source;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface NotebookViewerProps {
  id: string;
}

export function NotebookViewer({ id }: NotebookViewerProps) {
  const [notebook, setNotebook] = useState<NotebookRecord | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const supabase = createBrowserSupabaseClient();

      if (supabase) {
        const { data, error } = await supabase
          .from("notebooks")
          .select("*")
          .eq("id", id)
          .single();
        if (error || !data) {
          setNotFound(true);
        } else {
          setNotebook(data as NotebookRecord);
        }
        setIsLoading(false);
        return;
      }

      // Test environment: check window mock keyed by any ID
      if (typeof window !== "undefined") {
        const mock = (window as any).__supabase_mock_notebook as NotebookRecord | undefined;
        if (mock) {
          setNotebook(mock);
        } else {
          setNotFound(true);
        }
      } else {
        setNotFound(true);
      }
      setIsLoading(false);
    }

    fetch();
  }, [id]);

  if (isLoading) {
    return (
      <div style={{ padding: "var(--space-10)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Loading…
      </div>
    );
  }

  if (notFound) {
    return (
      <div
        data-testid="notebook-not-found"
        style={{
          padding: "var(--space-10)",
          textAlign: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        <h2 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--space-3)" }}>
          Notebook not found
        </h2>
        <p>The notebook you&apos;re looking for doesn&apos;t exist or has been removed.</p>
      </div>
    );
  }

  if (!notebook) return null;

  const cells = notebook.content?.cells ?? [];

  return (
    <div
      data-testid="notebook-preview"
      style={{
        maxWidth: "860px",
        margin: "0 auto",
        padding: "var(--space-8) var(--space-6)",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 4vw, var(--font-size-4xl))",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--color-text-primary)",
            marginBottom: "var(--space-2)",
          }}
        >
          {notebook.title}
        </h1>
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", margin: 0 }}>
          Generated on {formatDate(notebook.created_at)}
        </p>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-8)", flexWrap: "wrap" }}>
        <button
          data-testid="download-button"
          onClick={() => downloadNotebook(notebook.content, `${notebook.title}.ipynb`)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-5)",
            backgroundImage: "linear-gradient(135deg, var(--color-accent) 0%, #7c3aed 100%)",
            border: "none",
            borderRadius: "var(--radius-md)",
            color: "#ffffff",
            fontSize: "var(--font-size-sm)",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Download .ipynb
        </button>

        <button
          data-testid="open-colab-button"
          onClick={() => openInColab(notebook.content)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-5)",
            backgroundColor: "transparent",
            border: "1px solid rgba(249,171,0,0.5)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-colab)",
            fontSize: "var(--font-size-sm)",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Open in Colab
        </button>
      </div>

      {/* Cells */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {cells.map((cell, idx) => {
          const src = cellSource(cell.source);
          if (cell.cell_type === "markdown") {
            return (
              <div
                key={idx}
                data-testid="cell-markdown"
                style={{
                  padding: "var(--space-4)",
                  backgroundColor: "var(--color-bg-surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  whiteSpace: "pre-wrap",
                  fontSize: "var(--font-size-base)",
                  color: "var(--color-text-primary)",
                  lineHeight: 1.7,
                }}
              >
                {src}
              </div>
            );
          }
          return (
            <pre
              key={idx}
              data-testid="cell-code"
              style={{
                padding: "var(--space-4)",
                backgroundColor: "var(--color-bg-elevated)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                overflow: "auto",
                margin: 0,
              }}
            >
              <code
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-primary)",
                  whiteSpace: "pre",
                }}
              >
                {src}
              </code>
            </pre>
          );
        })}
      </div>
    </div>
  );
}
