import { Injectable, BadRequestException, Logger } from "@nestjs/common";

export interface PaperSection {
  title: string;
  content: string;
}

export interface ParsedPaper {
  rawText: string;
  pageCount: number;
  sections: PaperSection[];
}

// Patterns that identify section headings in academic papers
const SECTION_PATTERNS = [
  // "Abstract" standalone
  /^(Abstract)\s*$/im,
  // Numbered sections: "1. Introduction", "2 Methods", "3.1 Sub-section"
  /^(\d+\.?\d*\.?\s+[A-Z][A-Za-z\s&-]+)\s*$/m,
  // Common unnumbered headings
  /^(Introduction|Background|Related Work|Methodology|Methods|Approach|Algorithm|Experiments?|Results?|Discussion|Conclusion|Conclusions|Acknowledgements?|References)\s*$/im,
];

const MAX_PAGES = 100;
const PARSE_TIMEOUT_MS = 30000;

@Injectable()
export class PdfParserService {
  private readonly logger = new Logger(PdfParserService.name);

  async parse(buffer: Buffer): Promise<ParsedPaper> {
    const parseWork = this.doParse(buffer);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("PDF parsing timed out.")), PARSE_TIMEOUT_MS)
    );

    try {
      return await Promise.race([parseWork, timeout]);
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`PDF parse error: ${error.message}`);
      throw error;
    }
  }

  private async doParse(buffer: Buffer): Promise<ParsedPaper> {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const uint8 = new Uint8Array(buffer);
    const doc = await getDocument({ data: uint8 }).promise;

    const pageCount = doc.numPages;

    if (pageCount > MAX_PAGES) {
      throw new BadRequestException(
        `PDF exceeds maximum page count (${MAX_PAGES} pages).`
      );
    }

    const pageTexts: string[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item: any) => {
          if ("str" in item) return item.str;
          return "";
        })
        .join(" ");
      pageTexts.push(text);
    }

    const rawText = pageTexts.join("\n\n");
    const sections = this.extractSections(rawText);

    return { rawText, pageCount, sections };
  }

  private extractSections(text: string): PaperSection[] {
    // Split on double-space boundaries which pdfjs uses between text blocks
    // Also split on actual newlines
    const lines = text.split(/\n+| {2,}/).map((l) => l.trim()).filter(Boolean);
    const sectionBreaks: { title: string; lineIndex: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      for (const pattern of SECTION_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          sectionBreaks.push({ title: match[1].trim(), lineIndex: i });
          break;
        }
      }
    }

    if (sectionBreaks.length === 0) {
      return [{ title: "Full Text", content: text.trim() }];
    }

    const sections: PaperSection[] = [];

    for (let i = 0; i < sectionBreaks.length; i++) {
      const start = sectionBreaks[i].lineIndex + 1;
      const end =
        i + 1 < sectionBreaks.length
          ? sectionBreaks[i + 1].lineIndex
          : lines.length;

      const content = lines.slice(start, end).join("\n").trim();

      sections.push({
        title: sectionBreaks[i].title,
        content,
      });
    }

    return sections;
  }
}
