import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Résolution native des alias tsconfig (`@/*`), remplace vite-tsconfig-paths.
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    // Les specs Playwright (e2e/) tournent dans leur propre exécuteur.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
