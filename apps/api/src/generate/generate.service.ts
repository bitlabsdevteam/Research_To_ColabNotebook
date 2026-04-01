import { Injectable, Logger } from "@nestjs/common";
import { PdfParserService } from "../pdf-parser/pdf-parser.service";
import { FigureExtractorService } from "../pdf-parser/figure-extractor.service";
import { AiService } from "../ai/ai.service";
import { NotebookBuilderService } from "../notebook/notebook-builder.service";
import { validateNotebook } from "./notebook-validator";
import {
  validateFairSteerContent,
  FAIRSTEER_CONTENT_RETRY_INSTRUCTION,
} from "./fairsteer-content-validator";
import { GenerationError } from "./generation-error";
import { buildFairSteerPrompt } from "./prompts/fairsteer.prompt";

const MAX_ATTEMPTS = 2;
const RETRY_INSTRUCTION =
  "Ensure your response is valid JSON matching nbformat 4 exactly. " +
  "Every code cell MUST include an outputs field as an empty array. " +
  "Every cell MUST have cell_type ('code' or 'markdown') and source (string).";

@Injectable()
export class GenerateService {
  private readonly logger = new Logger(GenerateService.name);

  constructor(
    private readonly pdfParser: PdfParserService,
    private readonly figureExtractor: FigureExtractorService,
    private readonly aiService: AiService,
    private readonly notebookBuilder: NotebookBuilderService
  ) {}

  async generate(
    pdfBuffer: Buffer,
    apiKey: string,
    mode: "none" | "fairsteer" = "none"
  ) {
    // 1. Parse PDF text into sections (not retried — PDF errors are unrecoverable)
    const parsed = await this.pdfParser.parse(pdfBuffer);

    // 2. Extract figures from PDF (failures are soft — continue without figures)
    let figures: { page: number; base64: string; caption?: string }[] = [];
    try {
      figures = await this.figureExtractor.extract(pdfBuffer);
    } catch (err: any) {
      this.logger.warn(
        `Figure extraction failed, continuing without figures: ${err.message}`
      );
    }

    // Determine prompt overrides based on mode
    const promptOverrides =
      mode === "fairsteer"
        ? buildFairSteerPrompt(parsed.rawText ?? parsed.sections.map((s) => `${s.title}\n${s.content}`).join("\n\n"))
        : undefined;

    // 3 & 4. Generate + build + validate with up to MAX_ATTEMPTS retries
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // On retry: append structural retry instruction; if FairSteer content
      // failed on the previous attempt, also append the content retry instruction.
      const retryInstruction =
        attempt > 0
          ? RETRY_INSTRUCTION +
            (mode === "fairsteer" ? "\n\n" + FAIRSTEER_CONTENT_RETRY_INSTRUCTION : "")
          : undefined;

      try {
        const cells = await this.aiService.generateNotebook(
          parsed.sections,
          figures,
          apiKey,
          retryInstruction,
          promptOverrides
        );

        const notebook = this.notebookBuilder.build(cells, figures);

        // Structural validation (nbformat, cells, cell_type, source, outputs)
        const structural = validateNotebook(notebook);
        if (!structural.valid) {
          lastError = new Error(
            `Generated notebook is structurally invalid: ${structural.errors.join("; ")}`
          );
          this.logger.warn(
            `Attempt ${attempt + 1}/${MAX_ATTEMPTS} structural validation failed: ${lastError.message}`
          );
          continue; // retry
        }

        // Content validation — only for FairSteer mode
        if (mode === "fairsteer") {
          const content = validateFairSteerContent(notebook);
          if (!content.valid) {
            lastError = new Error(
              `FairSteer notebook missing required Dream 7B code: ${content.missing.join(", ")}`
            );
            this.logger.warn(
              `Attempt ${attempt + 1}/${MAX_ATTEMPTS} content validation failed: ${lastError.message}`
            );
            continue; // retry
          }
        }

        return notebook; // success
      } catch (err: any) {
        lastError = err;
        this.logger.warn(
          `Attempt ${attempt + 1}/${MAX_ATTEMPTS} failed: ${err.message}`
        );
        // continue to next attempt
      }
    }

    // Both attempts failed — surface the last error message
    const finalMessage =
      lastError instanceof GenerationError
        ? lastError.message
        : lastError?.message?.startsWith("FairSteer notebook missing")
          ? lastError.message
          : `Failed to generate a valid notebook after ${MAX_ATTEMPTS} attempts`;

    throw new GenerationError(finalMessage);
  }
}
