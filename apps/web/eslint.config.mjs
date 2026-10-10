import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Démo statique de l'étude de cas (maquette anonymisée, générée hors du dépôt).
    "public/demo/**",
    // Client Prisma généré (ignoré par Git).
    "lib/generated/**",
  ]),
]);

export default eslintConfig;
