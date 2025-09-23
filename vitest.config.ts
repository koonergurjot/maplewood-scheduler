import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    typecheck: {
      checker: "tsc",
      tsconfig: "tsconfig.test.json"
    }
  }
});
