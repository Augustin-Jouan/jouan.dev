/**
 * Vérifie que les morceaux de JS chargés après l'affichage pour le défilement restent sous leur budget
 * compressé : le défilement doux (Lenis, 8 Ko) et le trait conducteur de l'accueil (6 Ko). Chaque morceau
 * est repéré par son marqueur : `MARQUEUR_DEFILEMENT` de lib/defilement-lenis.ts, `MARQUEUR_TRAIT` de
 * lib/trait/trait-conducteur.ts.
 *
 * Usage : pnpm --filter web verifier-taille-defilement (après pnpm build)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const MORCEAUX = [
  { nom: "Défilement doux", marqueur: "defilement-lenis:v1", limite: 8 * 1024 },
  { nom: "Trait conducteur", marqueur: "trait-conducteur:v1", limite: 6 * 1024 },
];
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

const fichiers = [...fichiersJs(dossier)].map((f) => ({ f, texte: readFileSync(f, "utf8") }));
let echec = false;
for (const { nom, marqueur, limite } of MORCEAUX) {
  const trouves = fichiers.filter(({ texte }) => texte.includes(marqueur));
  if (trouves.length !== 1) {
    console.error(`${nom} introuvable ou ambigu (${trouves.length} trouvé(s)) : lancer pnpm build.`);
    echec = true;
    continue;
  }
  const taille = gzipSync(trouves[0].texte).length;
  console.log(`${nom} (${relative(app, trouves[0].f)}) : ${(taille / 1024).toFixed(1)} Ko compressés, limite ${limite / 1024} Ko.`);
  if (taille > limite) echec = true;
}
if (echec) process.exit(1);
