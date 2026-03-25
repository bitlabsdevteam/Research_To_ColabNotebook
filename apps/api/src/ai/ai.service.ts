import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import type { PaperSection } from "../pdf-parser/pdf-parser.service";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts/notebook-prompt";

export interface NotebookCell {
  cell_type: "markdown" | "code";
  source: string;
}

@Injectable()
export class AiService {
  async generateNotebook(
    sections: PaperSection[],
    figures: { page: number; base64: string; caption?: string }[],
    apiKey: string
  ): Promise<NotebookCell[]> {
    const client = new OpenAI({ apiKey });

    const userPrompt = buildUserPrompt(sections, figures);

    let response;
    try {
      response = await client.chat.completions.create({
        model: "gpt-5.4",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      });
    } catch (error: any) {
      throw new Error(
        `OpenAI API error: ${error.message || "Unknown error"}`
      );
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty response.");
    }

    let cells: NotebookCell[];
    try {
      cells = JSON.parse(content);
    } catch {
      throw new Error(
        `Failed to parse OpenAI response as JSON: ${content.slice(0, 200)}`
      );
    }

    if (!Array.isArray(cells)) {
      throw new Error("OpenAI response is not an array of cells.");
    }

    return cells;
  }
}
