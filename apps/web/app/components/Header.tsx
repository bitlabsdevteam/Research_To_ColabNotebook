"use client";

import { useTheme } from "../context/ThemeProvider";

function SunIcon() {
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
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
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
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      data-testid="site-header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        backgroundColor: "var(--color-bg-surface)",
        borderBottom: "1px solid var(--color-border)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 var(--space-6)",
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div data-testid="header-logo" aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="2" y="2" width="24" height="24" rx="6"
                fill="var(--color-accent)" fillOpacity="0.15"
                stroke="var(--color-accent)" strokeWidth="1.5"
              />
              <rect x="7" y="8" width="8" height="1.5" rx="0.75" fill="var(--color-accent-light)" />
              <rect x="7" y="11.5" width="14" height="1.5" rx="0.75" fill="var(--color-text-secondary)" />
              <rect x="7" y="15" width="11" height="1.5" rx="0.75" fill="var(--color-text-secondary)" />
              <path
                d="M17 7.5 L21 11 L17 14.5"
                stroke="var(--color-accent-light)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <span
            data-testid="header-brand-title"
            style={{
              fontSize: "var(--font-size-base)",
              fontWeight: 600,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Paper2Notebook
          </span>
        </div>

        {/* Right side: theme toggle + GitHub link */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {/* Theme toggle */}
          <button
            data-testid="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              backgroundColor: "transparent",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s, background-color 0.15s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border-focus)";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-bg-elevated)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-secondary)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
            }}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* GitHub link */}
          <a
            data-testid="header-github-link"
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on GitHub"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
              transition: "color 0.15s, border-color 0.15s, background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-text-primary)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--color-border-focus)";
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "var(--color-bg-elevated)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-text-secondary)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--color-border)";
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
            }}
          >
            <svg
              width="18" height="18" viewBox="0 0 24 24"
              fill="currentColor" xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
