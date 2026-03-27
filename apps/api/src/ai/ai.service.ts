import { Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";
import type { PaperSection } from "../pdf-parser/pdf-parser.service";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts/notebook-prompt";

export interface NotebookCell {
  cell_type: "markdown" | "code";
  source: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

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
      this.logger.error(`OpenAI API error: ${error.message || "Unknown error"}`);
      throw new Error("Notebook generation failed. Please try again.");
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      this.logger.error("OpenAI returned an empty response.");
      throw new Error("Notebook generation failed. Please try again.");
    }

    let cells: NotebookCell[];
    try {
      cells = JSON.parse(content);
    } catch {
      this.logger.error(
        `Failed to parse OpenAI response as JSON: ${content.slice(0, 200)}`
      );
      throw new Error("Notebook generation failed. Please try again.");
    }

    if (!Array.isArray(cells)) {
      this.logger.error("OpenAI response is not an array of cells.");
      throw new Error("Notebook generation failed. Please try again.");
    }

    const validCells = cells.filter((cell) => {
      if (typeof cell !== "object" || cell === null) {
        this.logger.warn(`Filtered out non-object cell entry`);
        return false;
      }
      if (cell.cell_type !== "markdown" && cell.cell_type !== "code") {
        this.logger.warn(`Filtered out cell with invalid cell_type: ${cell.cell_type}`);
        return false;
      }
      if (typeof cell.source !== "string" || cell.source.length === 0) {
        this.logger.warn(`Filtered out cell with empty or non-string source`);
        return false;
      }
      return true;
    });

    if (validCells.length === 0) {
      this.logger.error("No valid notebook cells returned by OpenAI.");
      throw new Error("Notebook generation failed. Please try again.");
    }

    return validCells;
  }
}
