import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": new URL("./tests/unit/server-only-stub.ts", import.meta.url).pathname },
  },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node", testTimeout: 30_000, hookTimeout: 60_000 },
});
