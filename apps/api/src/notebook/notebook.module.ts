import { Module } from "@nestjs/common";
import { NotebookBuilderService } from "./notebook-builder.service";

@Module({
  providers: [NotebookBuilderService],
  exports: [NotebookBuilderService],
})
export class NotebookModule {}
