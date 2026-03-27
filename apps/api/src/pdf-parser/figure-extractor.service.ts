import { Injectable, Logger } from "@nestjs/common";
import { OPS } from "pdfjs-dist/legacy/build/pdf.mjs";

export interface ExtractedFigure {
  page: number;
  base64: string;
  caption?: string;
}

@Injectable()
export class FigureExtractorService {
  private readonly logger = new Logger(FigureExtractorService.name);

  async extract(buffer: Buffer): Promise<ExtractedFigure[]> {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const uint8 = new Uint8Array(buffer);
    const doc = await getDocument({ data: uint8 }).promise;

    const figures: ExtractedFigure[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const operatorList = await page.getOperatorList();

      for (let j = 0; j < operatorList.fnArray.length; j++) {
        if (
          operatorList.fnArray[j] === OPS.paintImageXObject ||
          operatorList.fnArray[j] === OPS.paintJpegXObject
        ) {
          const imgName = operatorList.argsArray[j][0];
          try {
            const img = await page.objs.get(imgName);
            if (img && img.data) {
              const base64 = this.imageDataToBase64(img);
              if (base64) {
                figures.push({ page: i, base64 });
              }
            }
          } catch (err: any) {
            this.logger.warn(
              `Failed to extract image ${imgName} on page ${i}: ${err.message}`
            );
          }
        }
      }
    }

    return figures;
  }

  private imageDataToBase64(img: any): string | null {
    if (!img.data || !img.width || !img.height) return null;

    // img.data is raw pixel data — encode as simple base64
    // For simplicity, encode the raw RGBA/RGB data as base64
    const buffer = Buffer.from(img.data);
    return buffer.toString("base64");
  }
}
