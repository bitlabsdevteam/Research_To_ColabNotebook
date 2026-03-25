import {
  Controller,
  Post,
  HttpCode,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

@Controller("generate")
export class GenerateController {
  @Post()
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor("pdf", {
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (
          file.mimetype !== "application/pdf" &&
          !file.originalname.toLowerCase().endsWith(".pdf")
        ) {
          return cb(
            new BadRequestException("Only PDF files are accepted."),
            false
          );
        }
        cb(null, true);
      },
    })
  )
  async generate(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body("apiKey") apiKey: string | undefined
  ) {
    if (!file) {
      throw new BadRequestException("A PDF file is required.");
    }

    if (!apiKey || apiKey.trim().length === 0) {
      throw new BadRequestException("apiKey is required.");
    }

    // For now, just acknowledge receipt — pipeline wiring comes in Task 9
    return {
      message: "PDF received successfully.",
      fileName: file.originalname,
      fileSize: file.size,
    };
  }
}
