import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";
import { resolve } from "path";

const swcPlugin = swc.vite({
  module: { type: "es6" },
  jsc: {
    parser: { syntax: "typescript", decorators: true },
    transform: { legacyDecorator: true, decoratorMetadata: true },
  },
});

export default defineConfig({
  plugins: [swcPlugin],
  test: {
    projects: [
      {
        plugins: [swcPlugin],
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.spec.ts"],
        },
      },
      {
        plugins: [swcPlugin],
        test: {
          name: "integration",
          environment: "node",
          include: ["test/**/*.system.spec.ts"],
          sequence: { concurrent: false },
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/main.ts"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
