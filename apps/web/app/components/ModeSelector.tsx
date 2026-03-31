"use client";

export type Mode = "none" | "fairsteer";

interface ModeSelectorProps {
  value: Mode;
  onChange: (mode: Mode) => void;
}

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <select
        data-testid="mode-selector"
        value={value}
        onChange={(e) => onChange(e.target.value as Mode)}
        style={{
          width: "100%",
          height: "44px",
          padding: "0 var(--space-3)",
          backgroundColor: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-text-primary)",
          fontSize: "var(--font-size-sm)",
          fontFamily: "inherit",
          cursor: "pointer",
          appearance: "none",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right var(--space-3) center",
          paddingRight: "var(--space-8)",
        }}
      >
        <option value="none">None — general notebook</option>
        <option value="fairsteer">FairSteer — bias detection</option>
      </select>

      {value === "fairsteer" && (
        <div
          data-testid="fairsteer-banner"
          style={{
            padding: "var(--space-3) var(--space-4)",
            backgroundColor: "rgba(59,130,246,0.1)",
            border: "1px solid rgba(59,130,246,0.3)",
            borderRadius: "var(--radius-md)",
            color: "#60a5fa",
            fontSize: "var(--font-size-xs)",
            lineHeight: 1.5,
          }}
        >
          FairSteer mode: generates a notebook implementing BAD, DSV, and DAS
          bias detection for the model in your PDF
        </div>
      )}
    </div>
  );
}
