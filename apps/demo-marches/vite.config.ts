import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * La démo est servie par le site sous /demo/suivi-de-marches/ : elle se
 * construit directement dans son dossier `public` (ignoré par Git).
 * Le polyfill de préchargement injecterait un script en ligne, que la CSP du
 * site refuse : on s'en passe (navigateurs récents seulement).
 */
export default defineConfig({
  base: "/demo/suivi-de-marches/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: fileURLToPath(new URL("../web/public/demo/suivi-de-marches", import.meta.url)),
    emptyOutDir: true,
    modulePreload: { polyfill: false },
    assetsInlineLimit: 0,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: false,
  },
});
