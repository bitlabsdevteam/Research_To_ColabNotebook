import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  test: {
    globals: true,
    root: "./",
    include: ["tests/**/*.spec.ts"],
    exclude: ["tests/e2e/**"],
  },
  plugins: [
    swc.vite({
      module: { type: "es6" },
      jsc: {
        parser: { syntax: "typescript", decorators: true },
        transform: { decoratorMetadata: true },
      },
    }),
  ],
});
