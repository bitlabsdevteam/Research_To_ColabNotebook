"use client";

import { useCallback, useRef, useState } from "react";

const MAX_SIZE_MB = 20;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface PdfUploadProps {
  onFileSelect: (file: File | null) => void;
}

function CloudUploadIcon() {
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
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PdfUpload({ onFileSelect }: PdfUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = useCallback(
    (selected: File | null) => {
      setError(null);

      if (!selected) {
        setFile(null);
        onFileSelect(null);
        return;
      }

      if (!selected.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF files are accepted.");
        setFile(null);
        onFileSelect(null);
        return;
      }

      if (selected.size > MAX_SIZE_BYTES) {
        setError(`File must be under ${MAX_SIZE_MB} MB.`);
        setFile(null);
        onFileSelect(null);
        return;
      }

      setFile(selected);
      onFileSelect(selected);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      validateAndSetFile(e.dataTransfer.files[0] ?? null);
    },
    [validateAndSetFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      validateAndSetFile(e.target.files?.[0] ?? null);
    },
    [validateAndSetFile]
  );

  const dropzoneBorderColor = isDragOver
    ? "var(--color-accent)"
    : file
    ? "rgba(99,102,241,0.4)"
    : "var(--color-border)";

  const dropzoneBg = isDragOver
    ? "var(--color-accent-glow)"
    : "transparent";

  return (
    <div style={{ width: "100%" }}>
      <div
        data-testid="pdf-dropzone"
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dropzoneBorderColor}`,
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-8) var(--space-6)",
          textAlign: "center",
          cursor: "pointer",
          backgroundColor: dropzoneBg,
          animation: isDragOver ? "pulse-border 1s ease-in-out infinite" : "none",
          transition: "border-color 0.2s, background-color 0.2s",
        }}
      >
        <input
          ref={inputRef}
          data-testid="pdf-file-input"
          type="file"
          accept=".pdf"
          onChange={handleChange}
          style={{ display: "none" }}
        />

        {file ? (
          /* File-selected state */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
            <span
              data-testid="pdf-file-icon"
              style={{ color: "var(--color-accent-light)" }}
            >
              <DocumentIcon />
            </span>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                backgroundColor: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-full)",
                padding: "var(--space-1) var(--space-3)",
              }}
            >
              <span
                data-testid="pdf-file-name"
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: 500,
                  color: "var(--color-text-primary)",
                  maxWidth: "220px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.name}
              </span>
              <span
                data-testid="pdf-file-size"
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-muted)",
                  flexShrink: 0,
                }}
              >
                {formatSize(file.size)}
              </span>
            </div>

            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", margin: 0 }}>
              Click to replace
            </p>
          </div>
        ) : (
          /* Empty state */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
            <span
              data-testid="pdf-upload-icon"
              style={{
                color: isDragOver ? "var(--color-accent-light)" : "var(--color-text-muted)",
                transition: "color 0.2s",
              }}
            >
              <CloudUploadIcon />
            </span>

            <div data-testid="pdf-upload-helper">
              <p style={{
                fontSize: "var(--font-size-sm)",
                color: isDragOver ? "var(--color-accent-light)" : "var(--color-text-secondary)",
                margin: "0 0 var(--space-1)",
                transition: "color 0.2s",
              }}>
                {isDragOver ? "Drop to upload" : "Drag & drop a PDF, or click to browse"}
              </p>
              <p style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
                margin: 0,
              }}>
                Max {MAX_SIZE_MB} MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          data-testid="pdf-error"
          className="animate-shake"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-1)",
            marginTop: "var(--space-2)",
            fontSize: "var(--font-size-xs)",
            fontWeight: 500,
            color: "var(--color-error)",
            backgroundColor: "var(--color-error-glow)",
            border: "1px solid rgba(248,113,113,0.25)",
            borderRadius: "var(--radius-full)",
            padding: "2px var(--space-3)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
