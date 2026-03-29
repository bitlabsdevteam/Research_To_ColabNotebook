"use client";

import { useState } from "react";
import { useApiKey } from "../context/ApiKeyContext";

function LockIcon() {
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
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
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
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function ApiKeyInput() {
  const { apiKey, setApiKey } = useApiKey();
  const [showKey, setShowKey] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isFilled = apiKey.length > 0;

  return (
    <div style={{ width: "100%" }}>
      <label
        htmlFor="api-key"
        style={{
          display: "block",
          fontSize: "var(--font-size-sm)",
          fontWeight: 500,
          color: "var(--color-text-secondary)",
          marginBottom: "var(--space-2)",
        }}
      >
        OpenAI API Key
      </label>

      {/* Input wrapper */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          backgroundColor: "var(--color-bg-elevated)",
          border: `1px solid ${isFocused ? "var(--color-border-focus)" : isFilled ? "rgba(99,102,241,0.3)" : "var(--color-border)"}`,
          borderRadius: "var(--radius-md)",
          boxShadow: isFocused ? "0 0 0 3px var(--color-accent-glow)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      >
        {/* Lock icon */}
        <span
          data-testid="api-key-lock-icon"
          style={{
            position: "absolute",
            left: "var(--space-3)",
            color: isFilled ? "var(--color-accent-light)" : "var(--color-text-muted)",
            display: "flex",
            alignItems: "center",
            pointerEvents: "none",
            transition: "color 0.15s",
          }}
          aria-hidden="true"
        >
          <LockIcon />
        </span>

        {/* Input */}
        <input
          id="api-key"
          data-testid="api-key-input"
          type={showKey ? "text" : "password"}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="sk-..."
          autoComplete="off"
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            padding: "var(--space-3) var(--space-10) var(--space-3) var(--space-8)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-primary)",
            fontFamily: "inherit",
          }}
        />

        {/* Eye toggle */}
        <button
          type="button"
          data-testid="api-key-eye-toggle"
          onClick={() => setShowKey((v) => !v)}
          aria-label={showKey ? "Hide API key" : "Show API key"}
          style={{
            position: "absolute",
            right: "var(--space-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-muted)",
            padding: "var(--space-1)",
            borderRadius: "var(--radius-sm)",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-secondary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
          }}
        >
          {showKey ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {/* Filled indicator */}
      {isFilled && (
        <div
          data-testid="api-key-indicator"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-1)",
            marginTop: "var(--space-2)",
            fontSize: "var(--font-size-xs)",
            fontWeight: 500,
            color: "var(--color-success)",
            backgroundColor: "var(--color-success-glow)",
            border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: "var(--radius-full)",
            padding: "2px var(--space-2)",
          }}
        >
          <CheckIcon />
          Key set
        </div>
      )}
    </div>
  );
}
