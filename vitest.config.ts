import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Each test file gets a fresh module registry — prevents mock leakage between suites
    isolate: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["services/**/*.ts", "lib/actions/**/*.ts", "lib/seedBudgetLimits.ts"],
      exclude: ["node_modules/**", ".next/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
