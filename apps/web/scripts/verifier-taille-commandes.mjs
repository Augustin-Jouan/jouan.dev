/**
 * Vérifie que la palette de commandes (sous-projet 7), chargée au premier Cmd+K,
 * reste sous 8 Ko compressés et n'est pas chargée d'office par l'accueil. Son
 * morceau de JS est repéré par `MARQUEUR_PALETTE` de components/commandes/PaletteCommandes.tsx.
 *
 * Usage : pnpm --filter web verifier-taille-commandes   (après `pnpm build`)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const LIMITE = 8 * 1024;
const MARQUEUR = "palette-commandes:v1";
const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const dossier = join(app, ".next/static/chunks");
const accueil = join(app, ".next/server/app/index.html");

function* fichiersJs(chemin) {
  for (const nom of readdirSync(chemin)) {
    const complet = join(chemin, nom);
    if (statSync(complet).isDirectory()) yield* fichiersJs(complet);
    else if (nom.endsWith(".js")) yield complet;
  }
}

if (!existsSync(dossier) || !existsSync(accueil)) {
  console.error("Build introuvable (.next/static/chunks, accueil prérendu) : lancer pnpm build.");
  process.exit(1);
}

const trouves = [...fichiersJs(dossier)].filter((f) => readFileSync(f, "utf8").includes(MARQUEUR));
if (trouves.length !== 1) {
  console.error(`Morceau de la palette introuvable ou ambigu (${trouves.length} trouvé(s)) : lancer pnpm build.`);
  process.exit(1);
}

const chemin = relative(join(app, ".next"), trouves[0]);
if (readFileSync(accueil, "utf8").includes(chemin)) {
  console.error(`La palette (${chemin}) est chargée d'office par l'accueil : elle doit l'être au premier Cmd+K.`);
  process.exit(1);
}

const taille = gzipSync(readFileSync(trouves[0])).length;
console.log(`Palette de commandes (${relative(app, trouves[0])}) : ${(taille / 1024).toFixed(1)} Ko compressés, limite ${LIMITE / 1024} Ko.`);
if (taille > LIMITE) process.exit(1);
