"use client";

import { useState } from "react";
import { ApiKeyInput } from "./components/ApiKeyInput";
import { PdfUpload } from "./components/PdfUpload";
import { GenerateButton } from "./components/GenerateButton";
import { useApiKey } from "./context/ApiKeyContext";

export default function Home() {
  const { apiKey } = useApiKey();
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const canGenerate = apiKey.length > 0 && pdfFile !== null;

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
      <GenerateButton disabled={!canGenerate} />
    </main>
  );
}
