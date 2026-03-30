/**
 * Thrown when notebook generation fails after all retry attempts.
 * The controller catches this and returns HTTP 422 with { error: message }.
 */
export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationError";
  }
}
