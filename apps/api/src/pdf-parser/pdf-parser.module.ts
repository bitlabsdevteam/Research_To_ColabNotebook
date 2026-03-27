import { Module } from "@nestjs/common";
import { PdfParserService } from "./pdf-parser.service";
import { FigureExtractorService } from "./figure-extractor.service";

@Module({
  providers: [PdfParserService, FigureExtractorService],
  exports: [PdfParserService, FigureExtractorService],
})
export class PdfParserModule {}
