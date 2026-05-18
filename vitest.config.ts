import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: [
      "client/src/pages/Work/**/*.test.{ts,tsx}",
      "client/src/lib/__tests__/**/*.test.ts",
      "client/src/components/**/__tests__/**/*.test.{ts,tsx}",
      "shared/__tests__/**/*.test.ts",
      "server/__tests__/**/*.test.ts",
    ],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
});
