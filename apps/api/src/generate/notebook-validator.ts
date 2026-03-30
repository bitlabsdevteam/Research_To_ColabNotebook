export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates that a value conforms to the nbformat 4 notebook structure.
 *
 * Checks:
 *   1. Input is a non-null object (not an array)
 *   2. nbformat === 4 (number)
 *   3. cells is a non-empty array
 *   4. Every cell has cell_type "code" or "markdown"
 *   5. Every cell has source that is a string or string array
 *   6. Every code cell has outputs that is an array
 *
 * Collects all errors rather than stopping at the first.
 */
export function validateNotebook(json: unknown): ValidationResult {
  const errors: string[] = [];

  // Must be a plain object (not null, not array)
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    errors.push(
      "notebook must be a non-null object (got " +
        (json === null ? "null" : Array.isArray(json) ? "array" : typeof json) +
        ")"
    );
    return { valid: false, errors };
  }

  const nb = json as Record<string, unknown>;

  // nbformat must be the number 4
  if (nb["nbformat"] !== 4) {
    errors.push(
      `nbformat must be the number 4 (got ${JSON.stringify(nb["nbformat"])})`
    );
  }

  // cells must be a non-empty array
  if (!Array.isArray(nb["cells"])) {
    errors.push(
      `cells must be an array (got ${JSON.stringify(typeof nb["cells"])})`
    );
  } else if ((nb["cells"] as unknown[]).length === 0) {
    errors.push("cells must be a non-empty array");
  } else {
    const cells = nb["cells"] as unknown[];

    cells.forEach((cell, idx) => {
      if (cell === null || typeof cell !== "object" || Array.isArray(cell)) {
        errors.push(`cell[${idx}] must be an object`);
        return;
      }

      const c = cell as Record<string, unknown>;

      // cell_type must be "code" or "markdown"
      if (c["cell_type"] !== "code" && c["cell_type"] !== "markdown") {
        errors.push(
          `cell[${idx}].cell_type must be "code" or "markdown" (got ${JSON.stringify(c["cell_type"])})`
        );
      }

      // source must be a string or an array of strings
      const src = c["source"];
      if (
        src === undefined ||
        src === null ||
        (typeof src !== "string" && !Array.isArray(src))
      ) {
        errors.push(
          `cell[${idx}].source must be a string or string array (got ${JSON.stringify(typeof src)})`
        );
      }

      // code cells must have an outputs array
      if (c["cell_type"] === "code") {
        if (!Array.isArray(c["outputs"])) {
          errors.push(
            `cell[${idx}] is a code cell and must have an outputs array (got ${JSON.stringify(typeof c["outputs"])})`
          );
        }
      }
    });
  }

  return { valid: errors.length === 0, errors };
}
