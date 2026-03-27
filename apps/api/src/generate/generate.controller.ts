import {
  Controller,
  Post,
  HttpCode,
  UseInterceptors,
  UploadedFile,
  Headers,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { GenerateService } from "./generate.service";

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

@Controller("generate")
export class GenerateController {
  private readonly logger = new Logger(GenerateController.name);

  constructor(private readonly generateService: GenerateService) {}

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
    @Headers("authorization") authHeader: string | undefined
  ) {
    if (!file) {
      throw new BadRequestException("A PDF file is required.");
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new BadRequestException(
        "apiKey is required in Authorization header (Bearer <key>)."
      );
    }

    const apiKey = authHeader.slice(7).trim();
    if (apiKey.length === 0) {
      throw new BadRequestException(
        "apiKey is required in Authorization header (Bearer <key>)."
      );
    }

    try {
      const notebook = await this.generateService.generate(file.buffer, apiKey);
      return notebook;
    } catch (error: any) {
      this.logger.error(`Generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        "Generation failed. Please try again."
      );
    }
  }
}
