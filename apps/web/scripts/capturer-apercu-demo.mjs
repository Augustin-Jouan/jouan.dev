/**
 * Capture l'aperçu des démos (vignettes des études de cas et de l'offre de
 * l'accueil) : sert la build standalone sur le port 3200, ouvre chaque démo en
 * 1280 × 720 et enregistre un WebP qualité 80. Le suivi de marchés en thème
 * sombre, sur l'écran des marchés ; le site de l'artisan sur son accueil, en
 * mouvement réduit (aucune animation figée à mi-course).
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
const sortieMarches = join(app, "public/realisations/suivi-de-marches/apercu.webp");
const sortieArtisan = join(app, "public/realisations/site-artisan/ordinateur.webp");

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
    const enregistrer = async (page, sortie) => {
      await page.evaluate(() => document.fonts.ready);
      const png = await page.screenshot({ type: "png" });
      mkdirSync(dirname(sortie), { recursive: true });
      await sharp(png).webp({ quality: 80 }).toFile(sortie);
      console.log(`Aperçu enregistré : ${sortie}`);
    };
    const options = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 };

    const marches = await navigateur.newPage(options);
    await marches.goto(`http://127.0.0.1:${port}/demo/suivi-de-marches/index.html?theme=sombre`);
    // L'aperçu montre l'écran des marchés du chantier fictif de référence
    // (la carte du chantier est un bouton dont le nom est sa référence).
    await marches.getByRole("button", { name: "LEFÈVRE — Rivebourg", exact: true }).click();
    await marches.locator("table").first().waitFor();
    await enregistrer(marches, sortieMarches);

    const artisan = await navigateur.newPage({ ...options, reducedMotion: "reduce" });
    await artisan.goto(`http://127.0.0.1:${port}/demo/site-artisan`, { waitUntil: "networkidle" });
    // Comme dans la fenêtre de /realisations : sans le bandeau du plein écran. Puis l'apparition du titre finit.
    await artisan.evaluate(() => document.documentElement.removeAttribute("data-plein-ecran"));
    await artisan.waitForTimeout(3000);
    await enregistrer(artisan, sortieArtisan);
  } finally {
    await navigateur.close();
  }
} finally {
  serveur.kill("SIGTERM");
}
