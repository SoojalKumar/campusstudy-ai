import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url))
    }
  },
  test: {
    cache: {
      dir: process.env.VITEST_CACHE_DIR ?? "/tmp/campusstudy-web-vitest"
    },
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"]
  }
});
