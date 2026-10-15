/**
 * Fabrique la copie de démo du site de l'artisan : extrait l'état commité du
 * dépôt sdjElec (jamais modifié), l'adapte (demo-site-artisan.mjs), le
 * construit en export statique et range le résultat dans
 * public/demo/site-artisan. Écrit aussi data/demo-site-artisan.ts (date et
 * commit de la copie). Lancé à la main : la CI n'a pas accès à sdjElec.
 *
 * Usage : `pnpm fabriquer-demo-site-artisan [chemin du dépôt sdjElec]`.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { adapterActions, adapterConfig, adapterLayout, bandeauDemo, chargeurImages, lireSiteEnLigne } from "./demo-site-artisan.mjs";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const depot = process.argv[2] ?? join(homedir(), "Documents/Projets/EI/sdjElec");
const destination = join(app, "public/demo/site-artisan");
const trace = join(app, "data/demo-site-artisan.ts");
/** Grand côté maximal des images de la copie : la fenêtre de /realisations fait au plus 1 088 px de large. */
const COTE_MAX = 1200;

const git = (...args) => execFileSync("git", ["-C", depot, ...args], { encoding: "utf8" }).trim();

function lister(dossier) {
  return readdirSync(dossier, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name));
}

function adapter(copie, chemin, fonction) {
  const fichier = join(copie, chemin);
  if (!existsSync(fichier)) throw new Error(`Adaptation impossible : ${chemin} introuvable dans la copie.`);
  writeFileSync(fichier, fonction(readFileSync(fichier, "utf8")));
}

/**
 * Réduit et recompresse les images, même format et même nom : les chemins ne
 * changent pas. Une image n'est remplacée que si elle y gagne.
 */
async function reduireImages(dossier) {
  for (const fichier of lister(dossier)) {
    const format = { ".jpg": "jpeg", ".jpeg": "jpeg", ".png": "png", ".webp": "webp" }[extname(fichier).toLowerCase()];
    if (!format) continue;
    const origine = readFileSync(fichier);
    const sortie = await sharp(origine)
      .rotate()
      .resize({ width: COTE_MAX, height: COTE_MAX, fit: "inside", withoutEnlargement: true })
      .toFormat(format, format === "jpeg" ? { quality: 75, mozjpeg: true } : { quality: 80 })
      .toBuffer();
    if (sortie.length < origine.length) writeFileSync(fichier, sortie);
  }
}

if (!existsSync(join(depot, ".git"))) throw new Error(`Pas de dépôt Git dans ${depot}.`);
if (git("status", "--porcelain")) throw new Error(`${depot} a des modifications non commitées : la copie doit correspondre à un commit.`);
const commit = git("rev-parse", "--short", "HEAD");
const siteEnLigne = lireSiteEnLigne(readFileSync(join(app, "data/realisations.ts"), "utf8"));

const copie = mkdtempSync(join(tmpdir(), "demo-site-artisan-"));
try {
  console.log(`Extraction de sdjElec (${commit})…`);
  const archive = execFileSync("git", ["-C", depot, "archive", "HEAD"], { maxBuffer: 1 << 30 });
  execFileSync("tar", ["-x", "-C", copie], { input: archive });

  adapter(copie, "next.config.ts", adapterConfig);
  adapter(copie, "app/contact/actions.ts", adapterActions);
  adapter(copie, "app/layout.tsx", adapterLayout);
  writeFileSync(join(copie, "chargeur-images-demo.ts"), chargeurImages());
  execFileSync("mkdir", ["-p", join(copie, "components/demo")]);
  writeFileSync(join(copie, "components/demo/BandeauDemo.tsx"), bandeauDemo(siteEnLigne));
  // Incompatibles avec l'export statique, ou inutiles à la démo (un test importe le sitemap retiré).
  for (const chemin of ["app/robots.ts", "app/sitemap.ts"]) {
    if (!existsSync(join(copie, chemin))) throw new Error(`Adaptation impossible : ${chemin} introuvable dans la copie.`);
    rmSync(join(copie, chemin));
  }
  for (const fichier of lister(copie)) {
    const nom = relative(copie, fichier);
    if (/(^|\/)opengraph-image\.|(^|\/)twitter-image\.|\.test\.[jt]sx?$/.test(nom)) rmSync(fichier);
  }
  await reduireImages(join(copie, "public"));

  console.log("Installation et construction (export statique)…");
  execFileSync("npm", ["ci", "--no-audit", "--no-fund"], { cwd: copie, stdio: "inherit" });
  // Sans UMAMI_WEBSITE_ID, la copie ne charge pas la mesure d'audience.
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
  delete env.UMAMI_WEBSITE_ID;
  execFileSync("npx", ["next", "build"], { cwd: copie, stdio: "inherit", env });

  rmSync(destination, { recursive: true, force: true });
  cpSync(join(copie, "out"), destination, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  writeFileSync(
    trace,
    `/** Copie de démo du site de l'artisan (public/demo/site-artisan) : écrit par scripts/fabriquer-demo-site-artisan.mjs. */\nexport const COPIE_SITE_ARTISAN = { date: "${date}", commit: "${commit}" };\n`,
  );
  const octets = lister(destination).reduce((total, fichier) => total + statSync(fichier).size, 0);
  console.log(`Copie rangée dans public/demo/site-artisan (${(octets / 1024 / 1024).toFixed(1)} Mio), commit ${commit}.`);
} finally {
  rmSync(copie, { recursive: true, force: true });
}
