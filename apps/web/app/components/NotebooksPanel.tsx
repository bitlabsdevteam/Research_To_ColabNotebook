"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "../lib/supabase";
import { downloadNotebook } from "../lib/colab";

interface NotebookRow {
  id: string;
  title: string;
  created_at: string;
  content?: object;
}

interface NotebooksPanelProps {
  user: User;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SkeletonRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-3) 0",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", flex: 1 }}>
        <div style={{ height: "14px", width: "60%", borderRadius: "var(--radius-sm)", backgroundColor: "var(--color-bg-elevated)" }} />
        <div style={{ height: "12px", width: "30%", borderRadius: "var(--radius-sm)", backgroundColor: "var(--color-bg-elevated)" }} />
      </div>
    </div>
  );
}

export function NotebooksPanel({ user }: NotebooksPanelProps) {
  const [notebooks, setNotebooks] = useState<NotebookRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchNotebooks() {
      const supabase = createBrowserSupabaseClient();

      if (supabase) {
        const { data } = await supabase
          .from("notebooks")
          .select("id, title, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        setNotebooks(data ?? []);
        setIsLoading(false);
        return;
      }

      // Test environment: read from window mock
      if (typeof window !== "undefined" && (window as any).__supabase_mock_notebooks !== undefined) {
        setNotebooks((window as any).__supabase_mock_notebooks as NotebookRow[]);
        setIsLoading(false);
        return;
      }

      // Listen for the mock being set after mount
      const handler = () => {
        if ((window as any).__supabase_mock_notebooks !== undefined) {
          setNotebooks((window as any).__supabase_mock_notebooks as NotebookRow[]);
          setIsLoading(false);
        }
      };
      window.addEventListener("__supabase_mock_notebooks_ready", handler);
      return () => window.removeEventListener("__supabase_mock_notebooks_ready", handler);
    }

    fetchNotebooks();
  }, [user.id]);

  return (
    <div
      data-testid="notebooks-panel"
      style={{
        width: "100%",
        maxWidth: "480px",
        padding: "var(--space-6)",
        backgroundColor: "var(--color-bg-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
      }}
    >
      <h3
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: 600,
          color: "var(--color-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          margin: "0 0 var(--space-4)",
        }}
      >
        My Notebooks
      </h3>

      {isLoading ? (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      ) : notebooks.length === 0 ? (
        <p
          data-testid="notebooks-empty-state"
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-muted)",
            textAlign: "center",
            padding: "var(--space-6) 0",
            margin: 0,
          }}
        >
          No notebooks yet — generate your first one above
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {notebooks.map((nb) => (
            <li
              key={nb.id}
              data-testid="notebook-row"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-3)",
                padding: "var(--space-3) 0",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              {/* Title + time */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--font-size-sm)",
                    fontWeight: 500,
                    color: "var(--color-text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {nb.title}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {relativeTime(nb.created_at)}
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
                {/* Download */}
                <button
                  data-testid={`notebook-download-${nb.id}`}
                  onClick={() => nb.content && downloadNotebook(nb.content, `${nb.title}.ipynb`)}
                  title="Download .ipynb"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "30px",
                    height: "30px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "transparent",
                    color: "var(--color-text-secondary)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>

                {/* Share / copy link */}
                <a
                  href={`/notebook/${nb.id}`}
                  title="Share link"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "30px",
                    height: "30px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-secondary)",
                    textDecoration: "none",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
