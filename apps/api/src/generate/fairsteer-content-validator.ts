export interface FairSteerContentValidationResult {
  valid: boolean;
  missing: string[];
}

/**
 * Required code tokens for a valid Dream 7B FairSteer notebook.
 * Each entry is [ displayName, RegExp ] — matched case-insensitively against
 * the concatenated lowercase source of all cells.
 *
 * "AutoModel" uses a negative lookahead to avoid matching "AutoModelForCausalLM".
 * "PCA" uses a word-boundary equivalent to avoid false matches inside other words.
 */
const REQUIRED_TOKENS: [string, RegExp][] = [
  ["AutoModel", /automodel(?!for)/],
  ["trust_remote_code", /trust_remote_code/],
  ["mask_token_id", /mask_token_id/],
  ["LogisticRegression", /logisticregression/],
  ["output_hidden_states", /output_hidden_states/],
  ["register_forward_hook", /register_forward_hook/],
  ["diffusion_generate", /diffusion_generate/],
  ["DiffusionState", /diffusionstate/],
  ["np.mean", /np\.mean/],
  ["PCA", /\bpca\b/],
];

/**
 * Validates that a FairSteer notebook generated for Dream 7B contains
 * all required code tokens across its cell sources.
 *
 * This is a content-level check (called after validateNotebook passes).
 * It is only called when mode === "fairsteer".
 */
export function validateFairSteerContent(
  notebook: object
): FairSteerContentValidationResult {
  const nb = notebook as Record<string, unknown>;
  const cells = Array.isArray(nb["cells"]) ? (nb["cells"] as unknown[]) : [];

  // Concatenate all cell sources into a single lowercase string for matching
  const combined = cells
    .map((cell) => {
      const c = cell as Record<string, unknown>;
      const src = c["source"];
      if (typeof src === "string") return src;
      if (Array.isArray(src)) return (src as string[]).join("");
      return "";
    })
    .join("\n")
    .toLowerCase();

  const missing: string[] = [];
  for (const [displayName, pattern] of REQUIRED_TOKENS) {
    if (!pattern.test(combined)) {
      missing.push(displayName);
    }
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Retry instruction appended to the user prompt when content validation fails.
 */
export const FAIRSTEER_CONTENT_RETRY_INSTRUCTION =
  "CRITICAL: Your FairSteer notebook for Dream 7B is missing required code. " +
  "You MUST include ALL of the following:\n" +
  "- AutoModel (NOT AutoModelForCausalLM) to load Dream-org/Dream-v0-Instruct-7B\n" +
  "- trust_remote_code=True in from_pretrained() calls\n" +
  "- mask_token_id (value 151666) to identify non-mask positions\n" +
  "- LogisticRegression from sklearn for the BAD classifier\n" +
  "- output_hidden_states=True in the model forward pass\n" +
  "- register_forward_hook on model.model.layers[best_layer].mlp for DAS\n" +
  "- diffusion_generate() (not model.generate()) for Dream generation\n" +
  "- DiffusionState class with generation_tokens_hook_func to track mask boundary\n" +
  "- np.mean() to compute the DSV steering vector\n" +
  "- PCA from sklearn.decomposition for the activation scatter plot";
