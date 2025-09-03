import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    globals: true,
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['src/__tests__/**', 'tests/**'],
  },
  build: {
    rollupOptions: {
      external: ["papaparse"]
    }
  }
});
