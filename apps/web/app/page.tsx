"use client";

import { useState } from "react";
import { ApiKeyInput } from "./components/ApiKeyInput";
import { PdfUpload } from "./components/PdfUpload";
import { GenerateButton } from "./components/GenerateButton";
import { ResultPanel } from "./components/ResultPanel";
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
      formData.append("apiKey", apiKey);

      const res = await fetch(`${API_URL}/generate`, {
        method: "POST",
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
    <main className="flex min-h-screen flex-col items-center justify-center p-8 gap-8">
      <div className="text-center">
        <h1 data-testid="app-title" className="text-4xl font-bold mb-4">
          Paper2Notebook
        </h1>
        <p data-testid="app-description" className="text-lg text-gray-600">
          Convert research papers into interactive Google Colab tutorials
        </p>
      </div>
      <ApiKeyInput />
      <PdfUpload onFileSelect={setPdfFile} />
      <GenerateButton disabled={!canGenerate} onClick={handleGenerate} />

      {isLoading && (
        <div
          data-testid="loading-indicator"
          className="flex items-center gap-3 text-blue-600"
        >
          <svg
            className="animate-spin h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
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
          className="text-red-600 text-sm max-w-md text-center"
        >
          {error}
        </p>
      )}

      {notebook && <ResultPanel notebook={notebook} />}
    </main>
  );
}
