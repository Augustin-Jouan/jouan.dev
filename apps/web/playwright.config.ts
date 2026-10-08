import { defineConfig, devices } from "@playwright/test";
import { PORT_SMTP } from "./e2e/smtp-factice";

const PORT = 3100;
// Chromium sans GPU (CI, conteneurs) : WebGL2 passe par SwiftShader.
const lancement = { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] };

/** Prérequis : `pnpm build`. Le serveur testé est celui de production. */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/smtp-factice.ts",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "ordinateur", use: { ...devices["Desktop Chrome"], launchOptions: lancement } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: lancement } },
  ],
  webServer: {
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
    },
  },
});
