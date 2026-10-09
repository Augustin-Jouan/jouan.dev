import { defineConfig, devices } from "@playwright/test";
import { EMPREINTE_E2E, SECRET_E2E } from "./e2e/admin-test";
import { PORT_SMTP } from "./e2e/smtp-factice";

const PORT = 3100;
const PORT_DIRECT = 3201;
// Chromium sans GPU (CI, conteneurs) : WebGL2 passe par SwiftShader.
const lancement = { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] };

// Service temps réel : lancé seulement si le site a été construit avec son adresse
// (`NEXT_PUBLIC_DIRECT_URL=ws://127.0.0.1:3201/direct pnpm build`).
const serviceDirect = process.env.NEXT_PUBLIC_DIRECT_URL
  ? [
      {
        command: "pnpm --filter realtime start",
        url: `http://127.0.0.1:${PORT_DIRECT}/sante`,
        reuseExistingServer: !process.env.CI,
        env: {
          PORT: String(PORT_DIRECT),
          HOTE: "127.0.0.1",
          ORIGINES_AUTORISEES: `http://127.0.0.1:${PORT}`,
          // Tous les navigateurs de test partagent 127.0.0.1.
          CONNEXIONS_PAR_IP: "1000",
          // Tous les navigateurs de test partagent 127.0.0.1.
          SONDE_CONNEXIONS_PAR_IP: "1000",
        },
      },
    ]
  : [];

/** Prérequis : `pnpm build`. Le serveur testé est celui de production. */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }], ["json", { outputFile: ".mesures/playwright.json" }]] : "list",
  globalSetup: "./e2e/smtp-factice.ts",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "ordinateur",
      testIgnore: "direct.spec.ts",
      use: { ...devices["Desktop Chrome"], launchOptions: lancement },
    },
    {
      name: "mobile",
      testIgnore: "direct.spec.ts",
      use: { ...devices["Pixel 7"], launchOptions: lancement },
    },
    // Présence en direct : seul sur l'accueil, après les autres projets.
    {
      name: "direct",
      testMatch: "direct.spec.ts",
      dependencies: ["ordinateur", "mobile"],
      use: { ...devices["Desktop Chrome"], launchOptions: lancement },
    },
  ],
  webServer: [
    {
      command: "node scripts/demarrer-standalone.mjs",
      url: `http://127.0.0.1:${PORT}`,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: String(PORT),
        HOSTNAME: "127.0.0.1",
        SMTP_HOST: "127.0.0.1",
        SMTP_PORT: String(PORT_SMTP),
        SMTP_SECURE: "false",
        SMTP_USER: "test",
        SMTP_PASS: "test",
        CONTACT_FROM: "Test <test@jouan.dev>",
        CONTACT_TO: "boite@jouan.dev",
        DATABASE_URL: process.env.DATABASE_URL ?? "",
        ADMIN_EMPREINTE: EMPREINTE_E2E,
        ADMIN_SECRET: SECRET_E2E,
        // Tous les navigateurs de test partagent 127.0.0.1.
        MESURE_MAX_PAR_IP: "100000",
      },
    },
    ...serviceDirect,
  ],
});
