/**
 * Sanitizes extracted PDF text to mitigate prompt injection attacks.
 * Strips patterns commonly used to hijack LLM system prompts.
 */

export const INJECTION_PATTERNS: RegExp[] = [
  // "Ignore all previous instructions" and variants
  /ignore\s+(all\s+)?previous\s+instructions[^.]*/gi,
  /ignore\s+everything\s+above[^.]*/gi,
  /ignore\s+(all\s+)?(the\s+)?above[^.]*/gi,
  /disregard\s+(all\s+)?(your\s+)?(previous\s+|prior\s+)?(system\s+)?(prompt|instructions|rules)[^.]*/gi,
  /do\s+not\s+follow\s+(your\s+)?(original\s+)?(instructions|rules|prompt)[^.]*/gi,
  /forget\s+(all\s+)?(your\s+)?(previous\s+|prior\s+)?(instructions|rules|prompt)[^.]*/gi,

  // Role hijacking: "You are now...", "Pretend you are..."
  /you\s+are\s+now\s+[^.]+/gi,
  /pretend\s+(you\s+are|to\s+be)\s+[^.]+/gi,
  /act\s+as\s+(if\s+you\s+are\s+|a\s+|an\s+)[^.]+/gi,

  // Direct output manipulation
  /output\s+the\s+following[^.]*/gi,
  /respond\s+with\s+only[^.]*/gi,
  /return\s+only\s+the\s+following[^.]*/gi,

  // System/role message injection
  /\bsystem\s*:\s*[^.]+/gi,
  /\bassistant\s*:\s*[^.]+/gi,

  // Jailbreak patterns
  /\bDAN\s+mode\b[^.]*/gi,
  /\bjailbreak\b[^.]*/gi,
  /\bbypass\s+(safety|content|filter|restriction)[^.]*/gi,
];

export function sanitizeText(text: string): string {
  if (!text) return "";

  let sanitized = text;

  for (const pattern of INJECTION_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    sanitized = sanitized.replace(pattern, "");
  }

  // Clean up excessive whitespace left by removals
  sanitized = sanitized.replace(/[ \t]{2,}/g, " ").trim();

  return sanitized;
}
