import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";

let GenerateController: any;
let controller: any;
let mockGenerate: ReturnType<typeof vi.fn>;

const fakeNotebook = { nbformat: 4, cells: [] };

beforeEach(async () => {
  vi.clearAllMocks();
  mockGenerate = vi.fn().mockResolvedValue(fakeNotebook);

  const mod = await import(
    "../../apps/api/src/generate/generate.controller"
  );
  GenerateController = mod.GenerateController;
  controller = new GenerateController({ generate: mockGenerate });
});

const fakeFile = {
  buffer: Buffer.from("fake-pdf-content"),
  mimetype: "application/pdf",
  originalname: "paper.pdf",
  size: 1024,
} as Express.Multer.File;

describe("GenerateController", () => {
  it("returns notebook on successful generation", async () => {
    const result = await controller.generate(fakeFile, "Bearer sk-test-key");

    expect(result).toEqual(fakeNotebook);
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it("extracts apiKey from Bearer token correctly", async () => {
    await controller.generate(fakeFile, "Bearer sk-my-key-123");

    expect(mockGenerate).toHaveBeenCalledWith(fakeFile.buffer, "sk-my-key-123");
  });

  it("throws BadRequestException when file is missing", async () => {
    await expect(
      controller.generate(undefined, "Bearer sk-test")
    ).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException when Authorization header is missing", async () => {
    await expect(controller.generate(fakeFile, undefined)).rejects.toThrow(
      BadRequestException
    );
  });

  it("throws BadRequestException when Authorization header has no Bearer prefix", async () => {
    await expect(
      controller.generate(fakeFile, "Basic sk-test")
    ).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException when Bearer token is empty", async () => {
    await expect(
      controller.generate(fakeFile, "Bearer ")
    ).rejects.toThrow(BadRequestException);
  });

  it("throws InternalServerErrorException with generic message when pipeline fails", async () => {
    mockGenerate.mockRejectedValue(new Error("Secret internal error details"));

    try {
      await controller.generate(fakeFile, "Bearer sk-test");
      expect.fail("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(InternalServerErrorException);
      expect(e.message).not.toContain("Secret internal");
      expect(e.getResponse().message).toBe(
        "Generation failed. Please try again."
      );
    }
  });

  it("passes file buffer (not the whole file object) to generateService", async () => {
    await controller.generate(fakeFile, "Bearer sk-test");

    const [bufferArg] = mockGenerate.mock.calls[0];
    expect(Buffer.isBuffer(bufferArg)).toBe(true);
    expect(bufferArg).toBe(fakeFile.buffer);
  });
});
