"use client";

import { useState } from "react";
import { ApiKeyInput } from "./components/ApiKeyInput";
import { PdfUpload } from "./components/PdfUpload";
import { GenerateButton } from "./components/GenerateButton";
import { ResultPanel } from "./components/ResultPanel";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { useApiKey } from "./context/ApiKeyContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Home() {
  const { apiKey } = useApiKey();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notebook, setNotebook] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = apiKey.length > 0 && pdfFile !== null && !isLoading;

  async function handleGenerate() {
    if (!pdfFile || !apiKey) return;

    setIsLoading(true);
    setError(null);
    setNotebook(null);

    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);

      const res = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message || `Generation failed (status ${res.status})`
        );
      }

      const data = await res.json();
      setNotebook(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="dot-grid"
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg-base)",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Radial spotlight behind the form card */}
      <div
        data-testid="hero-spotlight"
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "800px",
          height: "600px",
          background:
            "radial-gradient(ellipse at center, var(--color-accent-glow) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
          animation: "spotlight 4s ease-in-out infinite",
        }}
      />

      <Header />

      <main
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 56px - 73px)",
          padding: "var(--space-8)",
          gap: "var(--space-8)",
        }}
      >
        {/* Hero text block */}
        <div
          data-testid="hero-block"
          className="animate-fade-up"
          style={{ textAlign: "center", maxWidth: "560px" }}
        >
          <h1
            data-testid="app-title"
            style={{
              fontSize: "clamp(2rem, 5vw, var(--font-size-5xl))",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-4)",
            }}
          >
            Paper2Notebook
          </h1>
          <p
            data-testid="hero-heading"
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: 500,
              color: "var(--color-text-primary)",
              lineHeight: 1.4,
              marginBottom: "var(--space-3)",
            }}
          >
            Turn any research paper into a{" "}
            <span style={{ color: "var(--color-accent-light)" }}>
              Colab tutorial
            </span>{" "}
            — instantly.
          </p>
          <p
            data-testid="app-description"
            style={{
              fontSize: "var(--font-size-base)",
              color: "var(--color-text-secondary)",
              lineHeight: 1.6,
            }}
          >
            Paste your OpenAI key, drop a PDF, done.
          </p>
        </div>

        {/* Form card */}
        <div
          data-testid="form-card"
          className="animate-fade-up-delay"
          style={{
            width: "100%",
            maxWidth: "480px",
            padding: "var(--space-8)",
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-card)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-6)",
          }}
        >
          <ApiKeyInput />
          <PdfUpload onFileSelect={setPdfFile} />
          <GenerateButton disabled={!canGenerate} onClick={handleGenerate} />

          {isLoading && (
            <div
              data-testid="loading-indicator"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                color: "var(--color-text-secondary)",
                justifyContent: "center",
              }}
            >
              <svg
                className="animate-spin h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                style={{ width: "20px", height: "20px", flexShrink: 0 }}
              >
                <circle
                  style={{ opacity: 0.25 }}
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  style={{ opacity: 0.75 }}
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Generating notebook...</span>
            </div>
          )}

          {error && (
            <p
              data-testid="error-message"
              style={{
                color: "var(--color-error)",
                fontSize: "var(--font-size-sm)",
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}
        </div>

        {notebook && <ResultPanel notebook={notebook} />}
      </main>

      <Footer />
    </div>
  );
}
