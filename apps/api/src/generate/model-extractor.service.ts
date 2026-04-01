import { Injectable } from "@nestjs/common";

export interface ModelInfo {
  name: string;
  huggingfaceId: string;
  isDiffusion: boolean;
  modelClass: string;
}

@Injectable()
export class ModelExtractorService {
  extract(rawText: string): ModelInfo {
    const text = rawText.toLowerCase();

    // Dream / diffusion LM — checked first (highest priority)
    if (
      text.includes("dream") ||
      text.includes("diffusion language model") ||
      text.includes("masked diffusion")
    ) {
      return {
        name: "Dream-7B",
        huggingfaceId: "Dream-org/Dream-v0-Instruct-7B",
        isDiffusion: true,
        modelClass: "AutoModel",
      };
    }

    // Llama-3 8B
    if ((text.includes("llama-3") || text.includes("llama 3")) && text.includes("8b")) {
      return {
        name: "Llama-3-8B",
        huggingfaceId: "meta-llama/Meta-Llama-3-8B-Instruct",
        isDiffusion: false,
        modelClass: "AutoModelForCausalLM",
      };
    }

    // Llama-2 7B
    if (text.includes("llama-2") && text.includes("7b")) {
      return {
        name: "Llama-2-7B",
        huggingfaceId: "meta-llama/Llama-2-7b-hf",
        isDiffusion: false,
        modelClass: "AutoModelForCausalLM",
      };
    }

    // Mistral 7B
    if (text.includes("mistral") && text.includes("7b")) {
      return {
        name: "Mistral-7B",
        huggingfaceId: "mistralai/Mistral-7B-Instruct-v0.2",
        isDiffusion: false,
        modelClass: "AutoModelForCausalLM",
      };
    }

    // Fallback
    return {
      name: "Unknown",
      huggingfaceId: "unknown/model",
      isDiffusion: false,
      modelClass: "AutoModelForCausalLM",
    };
  }
}
