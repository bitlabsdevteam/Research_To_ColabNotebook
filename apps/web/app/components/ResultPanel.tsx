"use client";

import { downloadNotebook, openInColab } from "../lib/colab";

interface ResultPanelProps {
  notebook: object;
  shareId?: string | null;
}

function CheckCircleIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11.5 14.5 15.5 10" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function ResultPanel({ notebook, shareId }: ResultPanelProps) {
  return (
    <div
      data-testid="result-panel"
      className="animate-slide-up"
      style={{
        width: "100%",
        maxWidth: "480px",
        padding: "var(--space-8)",
        backgroundColor: "var(--color-bg-surface)",
        border: "1px solid rgba(16,185,129,0.2)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "0 0 0 1px rgba(16,185,129,0.1), 0 4px 32px var(--color-success-glow)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Success header */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-3)",
          marginBottom: "var(--space-6)",
          textAlign: "center",
        }}
      >
        <span
          data-testid="result-check-icon"
          style={{ color: "var(--color-success)" }}
        >
          <CheckCircleIcon />
        </span>

        <h2
          data-testid="result-heading"
          style={{
            fontSize: "var(--font-size-lg)",
            fontWeight: 600,
            color: "var(--color-text-primary)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Notebook ready!
        </h2>

        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
            margin: 0,
          }}
        >
          Your Colab tutorial has been generated.
        </p>
      </div>

      {/* Save indicator */}
      {shareId && (
        <div
          data-testid="save-indicator"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-3)",
            backgroundColor: "var(--color-success-glow)",
            border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-success)",
            marginBottom: "var(--space-4)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>
            Saved to your account
            {" · "}
            <a
              href={`/notebook/${shareId}`}
              style={{ color: "var(--color-success)", textDecoration: "underline" }}
            >
              Share link
            </a>
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {/* Download — solid indigo gradient */}
        <button
          data-testid="download-button"
          onClick={() => downloadNotebook(notebook)}
          style={{
            position: "relative",
            overflow: "hidden",
            width: "100%",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-2)",
            backgroundImage: "linear-gradient(135deg, var(--color-accent) 0%, #7c3aed 100%)",
            border: "none",
            borderRadius: "var(--radius-md)",
            color: "#ffffff",
            fontSize: "var(--font-size-sm)",
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            boxShadow: "0 4px 16px var(--color-accent-glow)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--shadow-lift)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px var(--color-accent-glow)";
          }}
        >
          <DownloadIcon />
          Download .ipynb
        </button>

        {/* Open in Colab — outlined with orange accent */}
        <button
          data-testid="open-colab-button"
          onClick={() => openInColab(notebook)}
          style={{
            width: "100%",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-2)",
            backgroundColor: "transparent",
            border: "1px solid rgba(249,171,0,0.5)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-colab)",
            fontSize: "var(--font-size-sm)",
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            transition: "background-color 0.15s, border-color 0.15s, transform 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(249,171,0,0.08)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-colab)";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(249,171,0,0.5)";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          }}
        >
          Open in Colab
          <ExternalLinkIcon />
        </button>
      </div>
    </div>
  );
}
