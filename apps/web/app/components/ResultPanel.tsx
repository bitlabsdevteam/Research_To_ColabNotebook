"use client";

import { downloadNotebook, openInColab } from "../lib/colab";

interface ResultPanelProps {
  notebook: object;
}

export function ResultPanel({ notebook }: ResultPanelProps) {
  return (
    <div
      data-testid="result-panel"
      className="w-full max-w-md p-6 bg-white rounded-lg shadow-md border border-green-200"
    >
      <h2 className="text-lg font-semibold text-green-700 mb-4">
        Notebook Generated!
      </h2>
      <div className="flex flex-col gap-3">
        <button
          data-testid="download-button"
          onClick={() => downloadNotebook(notebook)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Download .ipynb
        </button>
        <button
          data-testid="open-colab-button"
          onClick={() => openInColab(notebook)}
          className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors cursor-pointer"
        >
          Open in Colab
        </button>
      </div>
    </div>
  );
}
