import type { PaperSection } from "../../pdf-parser/pdf-parser.service";

export const SYSTEM_PROMPT = `You are an expert at converting research papers into interactive Google Colab tutorial notebooks.

Given the extracted sections of a research paper, generate a JSON array of notebook cells that:

1. Start with a markdown cell containing the paper title and a brief overview
2. For each key section, create:
   - A markdown cell explaining the concept in tutorial style
   - A code cell implementing the algorithm or demonstrating the concept
3. Include pip install cells at the top for any required packages
4. Add inline comments in code cells explaining each step
5. End with a results/visualization section where applicable

Output ONLY a valid JSON array of cell objects. Each cell must have:
- "cell_type": either "markdown" or "code"
- "source": the cell content as a string

Do NOT include any text outside the JSON array.`;

export function buildUserPrompt(
  sections: PaperSection[],
  figures: { page: number; base64: string; caption?: string }[]
): string {
  let prompt = "## Research Paper Content\n\n";

  for (const section of sections) {
    prompt += `### ${section.title}\n${section.content}\n\n`;
  }

  if (figures.length > 0) {
    prompt += `\n## Figures\nThe paper contains ${figures.length} figure(s):\n`;
    for (const fig of figures) {
      prompt += `- Page ${fig.page}${fig.caption ? `: ${fig.caption}` : ""}\n`;
    }
  }

  prompt +=
    "\n\nGenerate a comprehensive tutorial notebook implementing the key algorithms and methodology from this paper. Return ONLY a JSON array of notebook cells.";

  return prompt;
}
