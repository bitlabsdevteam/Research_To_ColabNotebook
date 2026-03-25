"use client";

import { useCallback, useRef, useState } from "react";

const MAX_SIZE_MB = 20;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface PdfUploadProps {
  onFileSelect: (file: File | null) => void;
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
      const dropped = e.dataTransfer.files[0] ?? null;
      validateAndSetFile(dropped);
    },
    [validateAndSetFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0] ?? null;
      validateAndSetFile(selected);
    },
    [validateAndSetFile]
  );

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="w-full max-w-md">
      <div
        data-testid="pdf-dropzone"
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragOver
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input
          ref={inputRef}
          data-testid="pdf-file-input"
          type="file"
          accept=".pdf"
          onChange={handleChange}
          className="hidden"
        />
        {file ? (
          <div>
            <p data-testid="pdf-file-name" className="font-medium text-gray-800">
              {file.name}
            </p>
            <p data-testid="pdf-file-size" className="text-sm text-gray-500 mt-1">
              {formatSize(file.size)}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600">
              Drag & drop a PDF here, or click to browse
            </p>
            <p className="text-sm text-gray-400 mt-1">Max {MAX_SIZE_MB} MB</p>
          </div>
        )}
      </div>
      {error && (
        <p data-testid="pdf-error" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
