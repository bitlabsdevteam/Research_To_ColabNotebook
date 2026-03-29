export function Footer() {
  return (
    <footer
      data-testid="site-footer"
      style={{
        width: "100%",
        borderTop: "1px solid var(--color-border)",
        padding: "var(--space-6) var(--space-6)",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-muted)",
        }}
      >
        Built with{" "}
        <span style={{ color: "var(--color-text-secondary)" }}>
          Paper2Notebook
        </span>{" "}
        · v4
      </p>
    </footer>
  );
}
