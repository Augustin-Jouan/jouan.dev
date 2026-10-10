/**
 * Capture l'aperçu de la démo « suivi de marchés » (vignette de la page
 * d'étude de cas) : sert la build standalone sur le port 3200, ouvre la démo
 * en thème sombre, en 1280 × 720 et enregistre un WebP qualité 80.
 *
 * Prérequis : `pnpm build`. Usage : `pnpm capturer-apercu-demo`.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = 3200;
const sortie = join(app, "public/realisations/suivi-de-marches/apercu.webp");

const serveur = spawn(process.execPath, [join(app, "scripts/demarrer-standalone.mjs")], {
  stdio: "ignore",
  env: { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1" },
});

async function attendreServeur() {
  for (let i = 0; i < 60; i++) {
    try {
      const reponse = await fetch(`http://127.0.0.1:${port}/`);
      if (reponse.ok) return;
    } catch {
      // le serveur démarre encore
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Le serveur standalone ne répond pas.");
}

try {
  await attendreServeur();
  const navigateur = await chromium.launch();
  try {
    const page = await navigateur.newPage({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    await page.goto(`http://127.0.0.1:${port}/demo/suivi-de-marches/index.html?theme=sombre`);
    await page.locator("table").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    const png = await page.screenshot({ type: "png" });
    mkdirSync(dirname(sortie), { recursive: true });
    await sharp(png).webp({ quality: 80 }).toFile(sortie);
    console.log(`Aperçu enregistré : ${sortie}`);
  } finally {
    await navigateur.close();
  }
} finally {
  serveur.kill("SIGTERM");
}
