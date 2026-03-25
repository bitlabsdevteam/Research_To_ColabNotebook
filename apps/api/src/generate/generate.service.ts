import { Injectable } from "@nestjs/common";
import { PdfParserService } from "../pdf-parser/pdf-parser.service";
import { AiService } from "../ai/ai.service";
import { NotebookBuilderService } from "../notebook/notebook-builder.service";

@Injectable()
export class GenerateService {
  constructor(
    private readonly pdfParser: PdfParserService,
    private readonly aiService: AiService,
    private readonly notebookBuilder: NotebookBuilderService
  ) {}

  async generate(pdfBuffer: Buffer, apiKey: string) {
    // 1. Parse PDF text into sections
    const parsed = await this.pdfParser.parse(pdfBuffer);

    // 2. Generate notebook cells via GPT-5.4
    // (figures = [] for now; Task 6 will add figure extraction)
    const cells = await this.aiService.generateNotebook(
      parsed.sections,
      [],
      apiKey
    );

    // 3. Build .ipynb notebook
    const notebook = this.notebookBuilder.build(cells);

    return notebook;
  }
}
