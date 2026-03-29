"use client";

interface GenerateButtonProps {
  disabled: boolean;
  onClick?: () => void;
}

export function GenerateButton({ disabled, onClick }: GenerateButtonProps) {
  return (
    <button
      data-testid="generate-button"
      disabled={disabled}
      onClick={onClick}
      className={disabled ? "" : "generate-btn"}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        height: "48px",
        borderRadius: "var(--radius-md)",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        fontSize: "var(--font-size-base)",
        fontWeight: 600,
        letterSpacing: "0.01em",
        transition: "opacity 0.15s, transform 0.15s, box-shadow 0.15s",
        // Enabled: indigo→violet gradient; disabled: muted surface
        backgroundImage: disabled
          ? "none"
          : "linear-gradient(135deg, var(--color-accent) 0%, #7c3aed 100%)",
        backgroundColor: disabled ? "var(--color-bg-elevated)" : undefined,
        color: disabled ? "var(--color-text-muted)" : "#ffffff",
        boxShadow: disabled ? "none" : "0 4px 16px var(--color-accent-glow)",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--shadow-lift)";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px var(--color-accent-glow)";
      }}
    >
      {/* Shimmer sweep (hidden on disabled) */}
      {!disabled && <span className="btn-shimmer" aria-hidden="true" />}

      Generate Notebook
    </button>
  );
}
