import { describe, it, expect } from "vitest";
import { ModelExtractorService } from "../../apps/api/src/generate/model-extractor.service";

describe("ModelExtractorService", () => {
  const extractor = new ModelExtractorService();

  // ── Dream 7B detection ────────────────────────────────────────────────────

  it('detects "dream" keyword → Dream-7B diffusion model', () => {
    const result = extractor.extract(
      "We present Dream, a novel approach to language generation using masked diffusion."
    );
    expect(result.name).toBe("Dream-7B");
    expect(result.huggingfaceId).toBe("Dream-org/Dream-v0-Instruct-7B");
    expect(result.isDiffusion).toBe(true);
    expect(result.modelClass).toBe("AutoModel");
  });

  it('detects "diffusion language model" phrase → Dream-7B', () => {
    const result = extractor.extract(
      "This paper introduces a diffusion language model that outperforms autoregressive baselines."
    );
    expect(result.name).toBe("Dream-7B");
    expect(result.isDiffusion).toBe(true);
    expect(result.modelClass).toBe("AutoModel");
  });

  it('detects "masked diffusion" phrase → Dream-7B', () => {
    const result = extractor.extract(
      "Our masked diffusion approach achieves state-of-the-art results on BBQ."
    );
    expect(result.name).toBe("Dream-7B");
    expect(result.isDiffusion).toBe(true);
  });

  it("Dream detection is case-insensitive", () => {
    expect(extractor.extract("DREAM-v0 MODEL PAPER").name).toBe("Dream-7B");
    expect(extractor.extract("Masked Diffusion Language Model").isDiffusion).toBe(true);
  });

  it("Dream result has trust_remote_code-compatible AutoModel class", () => {
    const result = extractor.extract("Dream 7B diffusion model");
    expect(result.modelClass).toBe("AutoModel");
  });

  // ── Llama-2 7B detection ──────────────────────────────────────────────────

  it('detects "Llama-2" + "7b" → Llama-2-7B', () => {
    const result = extractor.extract(
      "We evaluate Llama-2 7B on the MMLU benchmark using few-shot prompting."
    );
    expect(result.name).toBe("Llama-2-7B");
    expect(result.huggingfaceId).toBe("meta-llama/Llama-2-7b-hf");
    expect(result.isDiffusion).toBe(false);
    expect(result.modelClass).toBe("AutoModelForCausalLM");
  });

  it('detects "llama-2" + "7B" case-insensitively', () => {
    const result = extractor.extract("llama-2 architecture, 7B parameters");
    expect(result.name).toBe("Llama-2-7B");
    expect(result.huggingfaceId).toBe("meta-llama/Llama-2-7b-hf");
  });

  // ── Llama-3 8B detection ──────────────────────────────────────────────────

  it('detects "Llama-3" + "8b" → Llama-3-8B', () => {
    const result = extractor.extract(
      "Experiments are conducted using Llama-3 8B Instruct fine-tuned on instruction data."
    );
    expect(result.name).toBe("Llama-3-8B");
    expect(result.huggingfaceId).toBe("meta-llama/Meta-Llama-3-8B-Instruct");
    expect(result.isDiffusion).toBe(false);
    expect(result.modelClass).toBe("AutoModelForCausalLM");
  });

  it('detects "llama 3" (space variant) + "8b"', () => {
    const result = extractor.extract("llama 3 model with 8b parameters");
    expect(result.name).toBe("Llama-3-8B");
  });

  // ── Mistral 7B detection ──────────────────────────────────────────────────

  it('detects "Mistral" + "7b" → Mistral-7B', () => {
    const result = extractor.extract(
      "We use Mistral 7B Instruct v0.2 as our base model for bias evaluation."
    );
    expect(result.name).toBe("Mistral-7B");
    expect(result.huggingfaceId).toBe("mistralai/Mistral-7B-Instruct-v0.2");
    expect(result.isDiffusion).toBe(false);
    expect(result.modelClass).toBe("AutoModelForCausalLM");
  });

  // ── Fallback ──────────────────────────────────────────────────────────────

  it("returns Unknown fallback when no model is detected", () => {
    const result = extractor.extract(
      "This paper presents a novel attention mechanism for natural language processing tasks."
    );
    expect(result.name).toBe("Unknown");
    expect(result.huggingfaceId).toBe("unknown/model");
    expect(result.isDiffusion).toBe(false);
    expect(result.modelClass).toBe("AutoModelForCausalLM");
  });

  it("returns Unknown for empty string", () => {
    const result = extractor.extract("");
    expect(result.name).toBe("Unknown");
  });

  // ── Priority: Dream takes precedence ─────────────────────────────────────

  it("Dream takes priority if text contains both Dream and Llama references", () => {
    const result = extractor.extract(
      "Compared to Llama-2 7B, our Dream diffusion model achieves better debiasing."
    );
    expect(result.name).toBe("Dream-7B");
    expect(result.isDiffusion).toBe(true);
  });
});
