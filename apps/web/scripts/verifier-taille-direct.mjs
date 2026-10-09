/**
 * Vérifie que le code de connexion temps réel, chargé après l'affichage, reste sous
 * 4 Ko compressés. Son morceau de JS est repéré par `MARQUEUR_DIRECT` de lib/direct/connexion.ts.
 *
 * Usage : pnpm --filter web verifier-taille-direct (après un build avec NEXT_PUBLIC_DIRECT_URL)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const LIMITE = 4 * 1024;
const MARQUEUR = "connexion-direct:v1";
const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const dossier = join(app, ".next/static/chunks");

function* fichiersJs(chemin) {
  for (const nom of readdirSync(chemin)) {
    const complet = join(chemin, nom);
    if (statSync(complet).isDirectory()) yield* fichiersJs(complet);
    else if (nom.endsWith(".js")) yield complet;
  }
}

if (!existsSync(dossier)) {
  console.error("Build introuvable (.next/static/chunks) : lancer pnpm build.");
  process.exit(1);
}

const trouves = [...fichiersJs(dossier)].filter((f) => readFileSync(f, "utf8").includes(MARQUEUR));
if (trouves.length !== 1) {
  console.error(`Code de connexion temps réel introuvable ou ambigu (${trouves.length} trouvé(s)) : lancer pnpm build.`);
  process.exit(1);
}

const taille = gzipSync(readFileSync(trouves[0])).length;
console.log(
  `Code de connexion temps réel (${relative(app, trouves[0])}) : ${(taille / 1024).toFixed(1)} Ko compressés, limite ${LIMITE / 1024} Ko.`
);
if (taille > LIMITE) process.exit(1);
