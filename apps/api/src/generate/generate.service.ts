import { Injectable, Logger } from "@nestjs/common";
import { PdfParserService } from "../pdf-parser/pdf-parser.service";
import { FigureExtractorService } from "../pdf-parser/figure-extractor.service";
import { AiService } from "../ai/ai.service";
import { NotebookBuilderService } from "../notebook/notebook-builder.service";

@Injectable()
export class GenerateService {
  private readonly logger = new Logger(GenerateService.name);

  constructor(
    private readonly pdfParser: PdfParserService,
    private readonly figureExtractor: FigureExtractorService,
    private readonly aiService: AiService,
    private readonly notebookBuilder: NotebookBuilderService
  ) {}

  async generate(pdfBuffer: Buffer, apiKey: string) {
    // 1. Parse PDF text into sections
    const parsed = await this.pdfParser.parse(pdfBuffer);

    // 2. Extract figures from PDF
    let figures: { page: number; base64: string; caption?: string }[] = [];
    try {
      figures = await this.figureExtractor.extract(pdfBuffer);
    } catch (err: any) {
      this.logger.warn(`Figure extraction failed, continuing without figures: ${err.message}`);
    }

    // 3. Generate notebook cells via GPT-5.4
    const cells = await this.aiService.generateNotebook(
      parsed.sections,
      figures,
      apiKey
    );

    // 4. Build .ipynb notebook
    const notebook = this.notebookBuilder.build(cells, figures);

    return notebook;
  }
}
