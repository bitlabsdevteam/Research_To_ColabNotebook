import { Module } from "@nestjs/common";
import { GenerateController } from "./generate.controller";
import { GenerateService } from "./generate.service";
import { PdfParserModule } from "../pdf-parser/pdf-parser.module";
import { AiModule } from "../ai/ai.module";
import { NotebookModule } from "../notebook/notebook.module";

@Module({
  imports: [PdfParserModule, AiModule, NotebookModule],
  controllers: [GenerateController],
  providers: [GenerateService],
})
export class GenerateModule {}
