/**
 * Vérifie que le moteur de l'intro, chargé après l'affichage, reste sous
 * 10 Ko compressés. Son morceau de JS est repéré par le marqueur
 * `MARQUEUR_MOTEUR` de lib/encre/moteur.ts.
 *
 * Usage : pnpm --filter web verifier-taille-encre   (après `pnpm build`)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const LIMITE = 10 * 1024;
const MARQUEUR = "moteur-encre:v1";
const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const dossier = join(app, ".next/static/chunks");

function* fichiersJs(chemin) {
  for (const nom of readdirSync(chemin)) {
    const complet = join(chemin, nom);
    if (statSync(complet).isDirectory()) yield* fichiersJs(complet);
    else if (nom.endsWith(".js")) yield complet;
  }
}

const trouves = [...fichiersJs(dossier)].filter((f) => readFileSync(f, "utf8").includes(MARQUEUR));
if (trouves.length !== 1) {
  console.error(`Morceau du moteur introuvable ou ambigu (${trouves.length} trouvé(s)) : lancer pnpm build.`);
  process.exit(1);
}

const taille = gzipSync(readFileSync(trouves[0])).length;
console.log(
  `Moteur de l'intro (${relative(app, trouves[0])}) : ${(taille / 1024).toFixed(1)} Ko compressés, limite ${LIMITE / 1024} Ko.`
);
if (taille > LIMITE) process.exit(1);
