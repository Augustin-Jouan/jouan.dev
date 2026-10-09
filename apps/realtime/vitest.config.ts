import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // En CI, un rapport JSON en plus : le nombre de tests passés est affiché dans les coulisses.
    ...(process.env.CI ? { reporters: ["default", "json"], outputFile: { json: ".mesures/vitest.json" } } : {}),
  },
});
